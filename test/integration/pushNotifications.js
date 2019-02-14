const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const owsCommon = require('@owstack/ows-common');
const async = require('async');
const helpers = require('./helpers');
const log = require('npmlog');
const PushNotificationsService = WalletService.PushNotificationsService;
const sjcl = require('sjcl');
const testConfig = require('config');
const TestData = require('../testdata');
const Server = WalletService.Server;
const lodash = owsCommon.deps.lodash;

log.debug = log.verbose;
log.level = 'info';

describe('Push notifications', function () {
    let server; let wallet; let requestStub; let pushNotificationsService; let walletId;

    beforeEach(function (done) {
        helpers.before(serviceName, done);
    });

    afterEach(function (done) {
        helpers.after(server, done);
    });

    describe('Single wallet', function () {
        beforeEach(function (done) {
            helpers.beforeEach(serviceName, function (res) {
                helpers.createAndJoinWallet(serviceName, 1, 1, function (s, w) {
                    server = s;
                    wallet = w;

                    let i = 0;
                    async.eachSeries(w.copayers, function (copayer, next) {
                        helpers.getAuthServer(serviceName, copayer.id, function (server) {
                            async.parallel([
                                function (done) {
                                    server.savePreferences({
                                        email: `copayer${  ++i  }@domain.com`,
                                        language: 'en',
                                        unit: 'bit',
                                    }, done);
                                },
                                function (done) {
                                    server.pushNotificationsSubscribe({
                                        token: '1234',
                                        packageName: 'com.wallet',
                                        platform: 'Android',
                                    }, done);
                                },
                            ], next);

                        });
                    }, function (err) {
                        should.not.exist(err);

                        requestStub = sinon.stub();
                        requestStub.yields();

                        pushNotificationsService = new PushNotificationsService({
                            BTC: {},
                            lockOpts: {},
                            pushNotificationsOpts: {
                                templatePath: './base-service/lib/templates',
                                defaultLanguage: 'en',
                                subjectPrefix: '',
                                pushServerUrl: 'http://localhost:8000',
                                authorizationKey: 'secret'
                            }
                        });
                        pushNotificationsService.start({
                            messageBroker: server.getMessageBroker(),
                            storage: helpers.getStorage(serviceName),
                            request: requestStub
                        }, function (err) {
                            should.not.exist(err);
                            done();
                        });
                    });
                });
            });
        });

        it('should build each notifications using preferences of the copayers', function (done) {
            server.savePreferences({
                language: 'en',
                unit: 'bit',
            }, function (err) {
                server.createAddress({}, function (err, address) {
                    should.not.exist(err);

                    // Simulate incoming tx notification
                    server._notify('NewIncomingTx', {
                        txid: '999',
                        address: address,
                        amount: 12300000,
                    }, {
                        isGlobal: true
                    }, function (err) {
                        setTimeout(function () {
                            const calls = requestStub.getCalls();
                            const args = lodash.map(calls, function (c) {
                                return c.args[0];
                            });
                            calls.length.should.equal(1);
                            args[0].body.notification.title.should.contain('New payment received');
                            args[0].body.notification.body.should.contain('123,000');
                            done();
                        }, 100);
                    });
                });
            });
        });

        it('should not notify auto-payments to creator', function (done) {
            server.createAddress({}, function (err, address) {
                should.not.exist(err);

                // Simulate incoming tx notification
                server._notify('NewIncomingTx', {
                    txid: '999',
                    address: address,
                    amount: 12300000,
                }, {
                    isGlobal: false
                }, function (err) {
                    setTimeout(function () {
                        const calls = requestStub.getCalls();
                        calls.length.should.equal(0);
                        done();
                    }, 100);
                });
            });
        });

        it('should notify copayers when payment is received', function (done) {
            server.createAddress({}, function (err, address) {
                should.not.exist(err);

                // Simulate incoming tx notification
                server._notify('NewIncomingTx', {
                    txid: '999',
                    address: address,
                    amount: 12300000,
                }, {
                    isGlobal: true
                }, function (err) {
                    setTimeout(function () {
                        const calls = requestStub.getCalls();
                        calls.length.should.equal(1);
                        done();
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
                            const calls = requestStub.getCalls();
                            calls.length.should.equal(1);
                            done();
                        }, 100);
                    });
                });
            });
        });
    });

    describe('Shared wallet', function () {
        beforeEach(function (done) {
            helpers.beforeEach(serviceName, function (res) {
                helpers.createAndJoinWallet(serviceName, 2, 3, function (s, w) {
                    server = s;
                    wallet = w;
                    let i = 0;
                    async.eachSeries(w.copayers, function (copayer, next) {
                        helpers.getAuthServer(serviceName, copayer.id, function (server) {
                            async.parallel([

                                function (done) {
                                    server.savePreferences({
                                        email: `copayer${  ++i  }@domain.com`,
                                        language: 'en',
                                        unit: 'bit',
                                    }, done);
                                },
                                function (done) {
                                    server.pushNotificationsSubscribe({
                                        token: '1234',
                                        packageName: 'com.wallet',
                                        platform: 'Android',
                                    }, done);
                                },
                            ], next);

                        });
                    }, function (err) {
                        should.not.exist(err);

                        requestStub = sinon.stub();
                        requestStub.yields();

                        pushNotificationsService = new PushNotificationsService({
                            BTC: {},
                            lockOpts: {},
                            pushNotificationsOpts: {
                                templatePath: './base-service/lib/templates',
                                defaultLanguage: 'en',
                                subjectPrefix: '',
                                pushServerUrl: 'http://localhost:8000',
                                authorizationKey: 'secret'
                            }
                        });
                        pushNotificationsService.start({
                            messageBroker: server.getMessageBroker(),
                            storage: helpers.getStorage(serviceName),
                            request: requestStub
                        }, function (err) {
                            should.not.exist(err);
                            done();
                        });
                    });
                });
            });
        });

        it('should build each notifications using preferences of the copayers', function (done) {
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
                    }, {
                        isGlobal: true
                    }, function (err) {
                        setTimeout(function () {
                            const calls = requestStub.getCalls();
                            const args = lodash.map(calls, function (c) {
                                return c.args[0];
                            });

                            calls.length.should.equal(3);

                            args[0].body.notification.title.should.contain('Nuevo pago recibido');
                            args[0].body.notification.body.should.contain('0.123');

                            args[1].body.notification.title.should.contain('New payment received');
                            args[1].body.notification.body.should.contain('123,000');

                            args[2].body.notification.title.should.contain('New payment received');
                            args[2].body.notification.body.should.contain('123,000');
                            done();
                        }, 100);
                    });
                });
            });
        });

        it('should notify copayers when payment is received', function (done) {
            server.createAddress({}, function (err, address) {
                should.not.exist(err);

                // Simulate incoming tx notification
                server._notify('NewIncomingTx', {
                    txid: '999',
                    address: address,
                    amount: 12300000,
                }, {
                    isGlobal: true
                }, function (err) {
                    setTimeout(function () {
                        const calls = requestStub.getCalls();
                        calls.length.should.equal(3);

                        done();
                    }, 100);
                });
            });
        });

        it('should not notify auto-payments to creator', function (done) {
            server.createAddress({}, function (err, address) {
                should.not.exist(err);

                // Simulate incoming tx notification
                server._notify('NewIncomingTx', {
                    txid: '999',
                    address: address,
                    amount: 12300000,
                }, {
                    isGlobal: false
                }, function (err) {
                    setTimeout(function () {
                        const calls = requestStub.getCalls();
                        calls.length.should.equal(2);

                        done();
                    }, 100);
                });
            });
        });

        it('should notify copayers a new tx proposal has been created', function (done) {
            helpers.stubUtxos(server, wallet, [1, 1], function () {
                server.createAddress({}, function (err, address) {
                    should.not.exist(err);
                    server._notify('NewTxProposal', {
                        txid: '999',
                        address: address,
                        amount: 12300000,
                    }, {
                        isGlobal: false
                    }, function (err) {
                        setTimeout(function () {
                            const calls = requestStub.getCalls();
                            calls.length.should.equal(2);

                            done();
                        }, 100);
                    });
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
                        const calls = requestStub.getCalls();
                        const args = lodash.map(lodash.takeRight(calls, 2), function (c) {
                            return c.args[0];
                        });

                        args[0].body.notification.title.should.contain('Payment proposal rejected');
                        done();
                    }, 100);
                });
            });
        });

        it('should notify copayers a new outgoing tx has been created', function (done) {
            helpers.stubUtxos(server, wallet, 1, function () {
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
                        async.eachSeries(lodash.range(1, 3), function (i, next) {
                            const copayer = TestData.copayers[i];
                            helpers.getAuthServer(serviceName, copayer.id44, function (s) {
                                server = s;
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
                        const calls = requestStub.getCalls();
                        const args = lodash.map(lodash.takeRight(calls, 2), function (c) {
                            return c.args[0];
                        });

                        args[0].body.notification.title.should.contain('Payment sent');
                        args[1].body.notification.title.should.contain('Payment sent');

                        sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(server.copayerId)).should.not.equal(args[0].body.data.copayerId);
                        sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(server.copayerId)).should.not.equal(args[1].body.data.copayerId);
                        done();
                    }, 100);
                });
            });
        });
    });

    describe('joinWallet', function () {
        beforeEach(function (done) {
            helpers.beforeEach(serviceName, function (res) {
                new Server({
                    storage: helpers.getStorage(serviceName)
                }, testConfig, function (s) {
                    server = s;

                    const walletOpts = {
                        name: 'my wallet',
                        m: 1,
                        n: 3,
                        pubKey: TestData.keyPair.pub,
                    };

                    server.createWallet(walletOpts, function (err, wId) {
                        should.not.exist(err);
                        walletId = wId;
                        should.exist(walletId);
                        requestStub = sinon.stub();
                        requestStub.yields();

                        pushNotificationsService = new PushNotificationsService({
                            lockOpts: {},
                            pushNotificationsOpts: {
                                templatePath: './base-service/lib/templates',
                                defaultLanguage: 'en',
                                subjectPrefix: '',
                                pushServerUrl: 'http://localhost:8000',
                                authorizationKey: 'secret'
                            }
                        });

                        pushNotificationsService.start({
                            messageBroker: server.getMessageBroker(),
                            storage: server.getStorage(),
                            request: requestStub
                        }, function (err) {
                            should.not.exist(err);
                            done();
                        });
                    });
                });
            });
        });

        it('should notify copayers when a new copayer just joined into your wallet except the one who joined', function (done) {
            async.eachSeries(lodash.range(3), function (i, next) {
                const copayerOpts = helpers.getSignedCopayerOpts(serviceName, {
                    walletId: walletId,
                    name: `copayer ${  i + 1}`,
                    xPubKey: TestData.copayers[i].xPubKey_44H_0H_0H,
                    requestPubKey: TestData.copayers[i].pubKey_1H_0,
                    customData: `custom data ${  i + 1}`,
                });

                server.joinWallet(copayerOpts, function (err, res) {
                    if (err) {
                        return next(err);
                    }

                    helpers.getAuthServer(serviceName, res.copayerId, function (server) {
                        server.pushNotificationsSubscribe({
                            token: `token:${  copayerOpts.name}`,
                            packageName: 'com.wallet',
                            platform: 'Android',
                        }, next);
                    });

                });
            }, function (err) {
                should.not.exist(err);
                setTimeout(function () {
                    const calls = requestStub.getCalls();
                    const args = lodash.filter(lodash.map(calls, function (call) {
                        return call.args[0];
                    }), function (arg) {
                        return arg.body.notification.title == 'New copayer';
                    });
                    server.getWallet(null, function (err, wallet) {
                        /*
              First call - copayer2 joined
              copayer2 should notify to copayer1
              copayer2 should NOT be notifyed
            */
                        const hashedCopayerIds = lodash.map(wallet.copayers, function (copayer) {
                            return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(copayer.id));
                        });
                        hashedCopayerIds[0].should.equal((args[0].body.data.copayerId));
                        hashedCopayerIds[1].should.not.equal((args[0].body.data.copayerId));

                        /*
              Second call - copayer3 joined
              copayer3 should notify to copayer1
            */
                        hashedCopayerIds[0].should.equal((args[1].body.data.copayerId));

                        /*
              Third call - copayer3 joined
              copayer3 should notify to copayer2
            */
                        hashedCopayerIds[1].should.equal((args[2].body.data.copayerId));

                        // copayer3 should NOT notify any other copayer
                        hashedCopayerIds[2].should.not.equal((args[1].body.data.copayerId));
                        hashedCopayerIds[2].should.not.equal((args[2].body.data.copayerId));
                        done();
                    });
                }, 100);
            });
        });
    });
});
