const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const owsCommon = require('@owstack/ows-common');
const async = require('async');
const Constants = owsCommon.Constants;
const EmailService = WalletService.EmailService;
const helpers = require('./helpers');
const log = require('npmlog');
const testConfig = require('config');
const TestData = require('../testdata');
const lodash = owsCommon.deps.lodash;

log.debug = log.verbose;
log.level = 'info';

describe('Email notifications', function () {
    let server; let wallet; let mailerStub; let emailService;

    beforeEach(function (done) {
        helpers.before(serviceName, done);
    });

    afterEach(function (done) {
        helpers.after(server, done);
    });

    describe('Shared wallet', function () {
        beforeEach(function (done) {
            helpers.beforeEach(serviceName, function (err, res) {
                helpers.createAndJoinWallet(serviceName, 2, 3, function (s, w) {
                    server = s;
                    wallet = w;

                    let i = 0;
                    async.eachSeries(w.copayers, function (copayer, next) {
                        helpers.getAuthServer(serviceName, copayer.id, function (server) {
                            server.savePreferences({
                                email: `copayer${  ++i  }@domain.com`,
                                unit: 'bit',
                            }, next);
                        });
                    }, function (err) {
                        should.not.exist(err);

                        mailerStub = sinon.stub();
                        mailerStub.sendMail = sinon.stub();
                        mailerStub.sendMail.yields();

                        const publicTxUrlTemplate = {};
                        publicTxUrlTemplate[Constants.LIVENET] = 'https://explorer.openwalletstack.com/tx/{{txid}}';
                        publicTxUrlTemplate[Constants.TESTNET] = 'https://test-explorer.openwalletstack.com/tx/{{txid}}';

                        const config = {
                            lockOpts: {},
                            mailer: mailerStub,
                            emailOpts: {
                                defaultLanguage: 'en',
                                from: 'ws@dummy.net',
                                subjectPrefix: '[test wallet]',
                                publicTxUrlTemplate: publicTxUrlTemplate
                            },
                            BTC: {}
                        };
                        lodash.defaults(config, testConfig);

                        emailService = new EmailService(config);

                        emailService.start({
                            messageBroker: server.getMessageBroker(),
                            storage: helpers.getStorage(serviceName)
                        }, function (err) {
                            should.not.exist(err);
                            done();
                        });
                    });
                });
            });
        });

        it('should notify copayers a new tx proposal has been created', function (done) {
            const _readTemplateFile_old = emailService._readTemplateFile;
            emailService._readTemplateFile = function (language, filename, cb) {
                if (lodash.endsWith(filename, '.html')) {
                    return cb(null, '<html><body>{{walletName}}</body></html>');
                } else {
                    _readTemplateFile_old.call(emailService, language, filename, cb);
                }
            };
            helpers.stubUtxos(server, wallet, [1, 1], function () {
                const txOpts = {
                    outputs: [{
                        toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
                        amount: 0.8e8
                    }],
                    feePerKb: 100e2
                };
                helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function (tx) {
                    setTimeout(function () {
                        const calls = mailerStub.sendMail.getCalls();
                        calls.length.should.equal(2);
                        const emails = lodash.map(calls, function (c) {
                            return c.args[0];
                        });
                        lodash.difference(['copayer2@domain.com', 'copayer3@domain.com'], lodash.map(emails, 'to')).should.be.empty;
                        const one = emails[0];
                        one.from.should.equal('ws@dummy.net');
                        one.subject.should.contain('New payment proposal');
                        should.exist(one.html);
                        one.html.indexOf('<html>').should.equal(0);
                        server.getStorage().fetchUnsentEmails(function (err, unsent) {
                            should.not.exist(err);
                            unsent.should.be.empty;
                            emailService._readTemplateFile = _readTemplateFile_old;
                            done();
                        });
                    }, 100);
                });
            });
        });

        it('should not send email if unable to apply template to notification', function (done) {
            const _applyTemplate_old = emailService._applyTemplate;
            emailService._applyTemplate = function (template, data, cb) {
                _applyTemplate_old.call(emailService, template, undefined, cb);
            };
            helpers.stubUtxos(server, wallet, [1, 1], function () {
                const txOpts = {
                    outputs: [{
                        toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
                        amount: 0.8e8
                    }],
                    feePerKb: 100e2
                };
                helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function (tx) {
                    setTimeout(function () {
                        const calls = mailerStub.sendMail.getCalls();
                        calls.length.should.equal(0);
                        server.getStorage().fetchUnsentEmails(function (err, unsent) {
                            should.not.exist(err);
                            unsent.should.be.empty;
                            emailService._applyTemplate = _applyTemplate_old;
                            done();
                        });
                    }, 100);
                });
            });
        });

        it('should notify copayers a new outgoing tx has been created', function (done) {
            const _readTemplateFile_old = emailService._readTemplateFile;
            emailService._readTemplateFile = function (language, filename, cb) {
                if (lodash.endsWith(filename, '.html')) {
                    return cb(null, '<html>{{&urlForTx}}<html>');
                } else {
                    _readTemplateFile_old.call(emailService, language, filename, cb);
                }
            };
            helpers.stubUtxos(server, wallet, [1, 1], function () {
                const txOpts = {
                    outputs: [{
                        toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
                        amount: 0.8e8
                    }],
                    feePerKb: 100e2
                };

                let txp;
                async.waterfall([

                    function (next) {
                        helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function (tx) {
                            next(null, tx);
                        });
                    },
                    function (t, next) {
                        txp = t;
                        async.eachSeries(lodash.range(2), function (i, next) {
                            const copayer = TestData.copayers[i];
                            helpers.getAuthServer(serviceName, copayer.id44, function (server) {
                                const signatures = helpers.clientSign(txp, copayer.xPrivKey_44H_0H_0H);
                                server.signTx({
                                    txProposalId: txp.id,
                                    signatures: signatures,
                                }, function (err, t) {
                                    txp = t;
                                    next();
                                });
                            });
                        }, next);
                    },
                    function (next) {
                        helpers.stubBroadcast(serviceName);
                        server.broadcastTx({
                            txProposalId: txp.id,
                        }, next);
                    },
                ], function (err) {
                    should.not.exist(err);

                    setTimeout(function () {
                        const calls = mailerStub.sendMail.getCalls();
                        const emails = lodash.map(lodash.takeRight(calls, 3), function (c) {
                            return c.args[0];
                        });
                        lodash.difference(['copayer1@domain.com', 'copayer2@domain.com', 'copayer3@domain.com'], lodash.map(emails, 'to')).should.be.empty;
                        const one = emails[0];
                        one.from.should.equal('ws@dummy.net');
                        one.subject.should.contain('Payment sent');
                        one.text.should.contain('800,000');
                        should.exist(one.html);
                        one.html.should.contain(`https://explorer.openwalletstack.com/tx/${  txp.txid}`);
                        server.getStorage().fetchUnsentEmails(function (err, unsent) {
                            should.not.exist(err);
                            unsent.should.be.empty;
                            emailService._readTemplateFile = _readTemplateFile_old;
                            done();
                        });
                    }, 100);
                });
            });
        });

        it('should notify copayers a tx has been finally rejected', function (done) {
            helpers.stubUtxos(server, wallet, 1, function () {
                const txOpts = {
                    outputs: [{
                        toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
                        amount: 0.8e8
                    }],
                    feePerKb: 100e2
                };

                let txpId;
                async.waterfall([

                    function (next) {
                        helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function (tx) {
                            next(null, tx);
                        });
                    },
                    function (txp, next) {
                        txpId = txp.id;
                        async.eachSeries(lodash.range(1, 3), function (i, next) {
                            const copayer = TestData.copayers[i];
                            helpers.getAuthServer(serviceName, copayer.id44, function (server) {
                                server.rejectTx({
                                    txProposalId: txp.id,
                                }, next);
                            });
                        }, next);
                    },
                ], function (err) {
                    should.not.exist(err);

                    setTimeout(function () {
                        const calls = mailerStub.sendMail.getCalls();
                        const emails = lodash.map(lodash.takeRight(calls, 2), function (c) {
                            return c.args[0];
                        });
                        lodash.difference(['copayer1@domain.com', 'copayer2@domain.com'], lodash.map(emails, 'to')).should.be.empty;
                        const one = emails[0];
                        one.from.should.equal('ws@dummy.net');
                        one.subject.should.contain('Payment proposal rejected');
                        server.getStorage().fetchUnsentEmails(function (err, unsent) {
                            should.not.exist(err);
                            unsent.should.be.empty;
                            done();
                        });
                    }, 100);
                });
            });
        });

        it('should notify copayers of incoming txs', function (done) {
            server.createAddress({}, function (err, address) {
                should.not.exist(err);

                // Simulate incoming tx notification
                server._notify('NewIncomingTx', {
                    txid: '999',
                    address: address,
                    amount: 12300000,
                }, function (err) {
                    setTimeout(function () {
                        const calls = mailerStub.sendMail.getCalls();
                        calls.length.should.equal(3);
                        const emails = lodash.map(calls, function (c) {
                            return c.args[0];
                        });
                        lodash.difference(['copayer1@domain.com', 'copayer2@domain.com', 'copayer3@domain.com'], lodash.map(emails, 'to')).should.be.empty;
                        const one = emails[0];
                        one.from.should.equal('ws@dummy.net');
                        one.subject.should.contain('New payment received');
                        one.text.should.contain('123,000');
                        server.getStorage().fetchUnsentEmails(function (err, unsent) {
                            should.not.exist(err);
                            unsent.should.be.empty;
                            done();
                        });
                    }, 100);
                });
            });
        });

        it('should notify copayers when tx is confirmed if they are subscribed', function (done) {
            server.createAddress({}, function (err, address) {
                should.not.exist(err);

                server.txConfirmationSubscribe({
                    txid: '123'
                }, function (err) {
                    should.not.exist(err);

                    // Simulate tx confirmation notification
                    server._notify('TxConfirmation', {
                        txid: '123',
                    }, function (err) {
                        setTimeout(function () {
                            const calls = mailerStub.sendMail.getCalls();
                            calls.length.should.equal(1);
                            const email = calls[0].args[0];
                            email.to.should.equal('copayer1@domain.com');
                            email.from.should.equal('ws@dummy.net');
                            email.subject.should.contain('Transaction confirmed');
                            server.getStorage().fetchUnsentEmails(function (err, unsent) {
                                should.not.exist(err);
                                unsent.should.be.empty;
                                done();
                            });
                        }, 100);
                    });
                });
            });
        });

        it('should notify each email address only once', function (done) {
            // Set same email address for copayer1 and copayer2
            server.savePreferences({
                email: 'copayer2@domain.com',
            }, function (err) {
                server.createAddress({}, function (err, address) {
                    should.not.exist(err);

                    // Simulate incoming tx notification
                    server._notify('NewIncomingTx', {
                        txid: '999',
                        address: address,
                        amount: 12300000,
                    }, function (err) {
                        setTimeout(function () {
                            const calls = mailerStub.sendMail.getCalls();
                            calls.length.should.equal(2);
                            const emails = lodash.map(calls, function (c) {
                                return c.args[0];
                            });
                            lodash.difference(['copayer2@domain.com', 'copayer3@domain.com'], lodash.map(emails, 'to')).should.be.empty;
                            const one = emails[0];
                            one.from.should.equal('ws@dummy.net');
                            one.subject.should.contain('New payment received');
                            one.text.should.contain('123,000');
                            server.getStorage().fetchUnsentEmails(function (err, unsent) {
                                should.not.exist(err);
                                unsent.should.be.empty;
                                done();
                            });
                        }, 100);
                    });
                });
            });
        });

        it('should build each email using preferences of the copayers', function (done) {
            // Set same email address for copayer1 and copayer2
            server.savePreferences({
                email: 'copayer1@domain.com',
                language: 'es',
                unit: 'BTC',
            }, function (err) {
                server.createAddress({}, function (err, address) {
                    should.not.exist(err);

                    // Simulate incoming tx notification
                    server._notify('NewIncomingTx', {
                        txid: '999',
                        address: address,
                        amount: 12300000,
                    }, function (err) {
                        setTimeout(function () {
                            const calls = mailerStub.sendMail.getCalls();
                            calls.length.should.equal(3);
                            const emails = lodash.map(calls, function (c) {
                                return c.args[0];
                            });
                            const spanish = lodash.find(emails, {
                                to: 'copayer1@domain.com'
                            });
                            spanish.from.should.equal('ws@dummy.net');
                            spanish.subject.should.contain('Nuevo pago recibido');
                            spanish.text.should.contain('0.123 BTC');
                            const english = lodash.find(emails, {
                                to: 'copayer2@domain.com'
                            });
                            english.from.should.equal('ws@dummy.net');
                            english.subject.should.contain('New payment received');
                            english.text.should.contain('123,000 bits');
                            done();
                        }, 100);
                    });
                });
            });
        });

        it('should support multiple emailservice instances running concurrently', function (done) {
            const emailService2 = new EmailService({
                mailer: mailerStub,
                emailOpts: {
                    defaultLanguage: 'en',
                    defaultUnit: 'BTC',
                    from: 'ws@dummy.net',
                    subjectPrefix: '[test wallet 2]',
                },
                BTC: {}
            });
            emailService2.start({
                lock: emailService.lock, // Use same locker service
                messageBroker: server.getMessageBroker(),
                storage: helpers.getStorage(serviceName)
            }, function (err) {
                helpers.stubUtxos(server, wallet, 1, function () {
                    const txOpts = {
                        outputs: [{
                            toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
                            amount: 0.8e8
                        }],
                        feePerKb: 100e2
                    };
                    helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function (tx) {
                        setTimeout(function () {
                            const calls = mailerStub.sendMail.getCalls();
                            calls.length.should.equal(2);
                            server.getStorage().fetchUnsentEmails(function (err, unsent) {
                                should.not.exist(err);
                                unsent.should.be.empty;
                                done();
                            });
                        }, 100);
                    });
                });
            });
        });
    });

    describe('1-of-N wallet', function () {
        beforeEach(function (done) {
            helpers.beforeEach(serviceName, function (res) {
                helpers.createAndJoinWallet(serviceName, 1, 2, function (s, w) {
                    server = s;
                    wallet = w;

                    let i = 0;
                    async.eachSeries(w.copayers, function (copayer, next) {
                        helpers.getAuthServer(serviceName, copayer.id, function (server) {
                            server.savePreferences({
                                email: `copayer${  ++i  }@domain.com`,
                                unit: 'bit',
                            }, next);
                        });
                    }, function (err) {
                        should.not.exist(err);

                        mailerStub = sinon.stub();
                        mailerStub.sendMail = sinon.stub();
                        mailerStub.sendMail.yields();

                        emailService = new EmailService({
                            lockOpts: {},
                            mailer: mailerStub,
                            emailOpts: {
                                defaultLanguage: 'en',
                                from: 'ws@dummy.net',
                                subjectPrefix: '[test wallet]',
                                publicTxUrlTemplate: publicTxUrlTemplate
                            },
                            BTC: {}
                        });

                        var publicTxUrlTemplate = {};
                        publicTxUrlTemplate[Constants.LIVENET] = 'https://explorer.openwalletstack.com/tx/{{txid}}';
                        publicTxUrlTemplate[Constants.TESTNET] = 'https://test-explorer.openwalletstack.com/tx/{{txid}}';

                        emailService.start({
                            messageBroker: server.getMessageBroker(),
                            storage: helpers.getStorage(serviceName)
                        }, function (err) {
                            should.not.exist(err);
                            done();
                        });
                    });
                });
            });

            it('should NOT notify copayers a new tx proposal has been created', function (done) {
                helpers.stubUtxos(server, wallet, [1, 1], function () {
                    const txOpts = {
                        outputs: [{
                            toAddress: '18PzpUFkFZE8zKWUPvfykkTxmB9oMR8qP7',
                            amount: 0.8e8
                        }],
                        feePerKb: 100e2
                    };
                    helpers.createAndPublishTx(server, txOpts, TestData.copayers[0].privKey_1H_0, function (tx) {
                        setTimeout(function () {
                            const calls = mailerStub.sendMail.getCalls();
                            calls.length.should.equal(0);
                            done();
                        }, 100);
                    });
                });
            });
        });

    });
});
