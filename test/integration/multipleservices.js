const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../../');

const Services = {
    BCH: Service.BCH.WalletService,
    BTC: Service.BTC.WalletService,
    LTC: Service.LTC.WalletService
};

const owsCommon = require('@owstack/ows-common');
const async = require('async');
const helpers = require('./helpers');
const testConfig = require('config');
const TestData = require('../testdata');
const lodash = owsCommon.deps.lodash;

let storage; let blockchainExplorer; let request;

describe('Multiple wallet services', function () {

    // Test all services.
    Object.keys(Services).forEach(function (serviceName) {
        describe(`(${  serviceName  }) service`, function () {
            const Server = Services[serviceName].Server;

            before(function (done) {
                helpers.before(serviceName, done);
            });

            beforeEach(function (done) {
                helpers.beforeEach(serviceName, function (err, res) {
                    storage = res.storage;
                    blockchainExplorer = res.blockchainExplorer;
                    request = res.request;
                    done();
                });
            });

            describe('#getServiceVersion for all services', function () {
                it('should get version from package', function () {
                    Server.getServiceVersion().should.equal(`ws-${  require('../../package').version}`);
                });
            });

            describe('#getInstance', function () {
                it(`should get ${  serviceName  }server instance`, function () {
                    Server.getInstance({
                        clientVersion: 'wc-0.0.1',
                        blockchainExplorer: blockchainExplorer,
                        request: request,
                        storage: helpers.getStorage(serviceName),
                        force: true
                    }, testConfig, function (server) {
                        server.getClientVersion().should.equal('wc-0.0.1');
                    });
                });

                it(`should get ${  serviceName  } server instance for non-wc clients`, function () {
                    Server.getInstance({
                        clientVersion: 'dummy-1.0.0',
                        blockchainExplorer: blockchainExplorer,
                        request: request,
                        storage: helpers.getStorage(serviceName),
                        force: true
                    }, testConfig, function (server) {
                        server.clientVersion.should.equal('dummy-1.0.0');

                        Server.getInstance({
                            blockchainExplorer: blockchainExplorer,
                            request: request,
                            storage: helpers.getStorage(serviceName),
                            force: true
                        }, testConfig, function (server) {
                            (server.clientVersion == null).should.be.true;
                        });
                    });
                });
            });

            describe('#getInstanceWithAuth', function () {
                it(`should get ${  serviceName  } server instance for existing copayer`, function (done) {
                    helpers.createAndJoinWallet(serviceName, 1, 2, function (s, wallet) {
                        const xpriv = TestData.copayers[0].xPrivKey;
                        const priv = TestData.copayers[0].privKey_1H_0;

                        const sig = helpers.signMessage(serviceName, 'hello world', priv);

                        Server.getInstanceWithAuth({
                            clientVersion: 'wc-2.0.0',
                            blockchainExplorer: blockchainExplorer,
                            request: request,
                            storage: helpers.getStorage(serviceName),
                            force: true
                        }, testConfig, {
                            copayerId: wallet.copayers[0].id,
                            message: 'hello world',
                            signature: sig,
                            walletId: '123'
                        }, function (err, server) {
                            should.not.exist(err);
                            server.walletId.should.equal(wallet.id);
                            server.copayerId.should.equal(wallet.copayers[0].id);
                            server.clientVersion.should.equal('wc-2.0.0');
                            done();
                        });
                    });
                });
            });

            describe('#createWallet', function () {
                let server;

                beforeEach(function (done) {
                    new Server({
                        blockchainExplorer: blockchainExplorer,
                        request: request,
                        storage: helpers.getStorage(serviceName)
                    }, testConfig, function (s) {
                        server = s;
                        done();
                    });
                });

                it('should create and store wallet', function (done) {
                    const opts = {
                        name: 'my wallet',
                        m: 2,
                        n: 3,
                        pubKey: TestData.keyPair.pub,
                    };
                    server.createWallet(opts, function (err, walletId) {
                        should.not.exist(err);
                        server.getStorage().fetchWallet(walletId, function (err, wallet) {
                            should.not.exist(err);
                            wallet.id.should.equal(walletId);
                            wallet.name.should.equal('my wallet');
                            done();
                        });
                    });
                });
            });

            describe('#joinWallet', function () {
                describe('New clients', function () {
                    let server; let walletId;

                    beforeEach(function (done) {
                        Server.getInstance({
                            blockchainExplorer: blockchainExplorer,
                            request: request,
                            storage: helpers.getStorage(serviceName),
                            force: true
                        }, testConfig, function (s) {
                            server = s;

                            const walletOpts = {
                                name: 'my wallet',
                                m: 1,
                                n: 2,
                                pubKey: TestData.keyPair.pub,
                            };
                            server.createWallet(walletOpts, function (err, wId) {
                                should.not.exist(err);
                                walletId = wId;
                                should.exist(walletId);
                                done();
                            });
                        });
                    });

                    it('should join existing wallet', function (done) {
                        const copayerOpts = helpers.getSignedCopayerOpts(serviceName, {
                            walletId: walletId,
                            name: 'me',
                            xPubKey: TestData.copayers[0].xPubKey_44H_0H_0H,
                            requestPubKey: TestData.copayers[0].pubKey_1H_0,
                            customData: 'dummy custom data',
                        });
                        server.joinWallet(copayerOpts, function (err, result) {
                            should.not.exist(err);
                            const copayerId = result.copayerId;
                            helpers.getAuthServer(serviceName, copayerId, function (server) {
                                server.getWallet({}, function (err, wallet) {
                                    wallet.id.should.equal(walletId);
                                    wallet.copayers.length.should.equal(1);
                                    const copayer = wallet.copayers[0];
                                    copayer.name.should.equal('me');
                                    copayer.id.should.equal(copayerId);
                                    copayer.customData.should.equal('dummy custom data');
                                    server.getNotifications({}, function (err, notifications) {
                                        should.not.exist(err);
                                        let notif = lodash.find(notifications, {
                                            type: 'NewCopayer'
                                        });
                                        should.exist(notif);
                                        notif.data.walletId.should.equal(walletId);
                                        notif.data.copayerId.should.equal(copayerId);
                                        notif.data.copayerName.should.equal('me');

                                        notif = lodash.find(notifications, {
                                            type: 'WalletComplete'
                                        });
                                        should.not.exist(notif);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });

        });
    });

    describe('Handle requests in isolation', function () {
        const servers = {};

        beforeEach(function (done) {
            async.each(Object.keys(Services), function (serviceName, next) {
                new Services[serviceName].Server({
                    blockchainExplorer: helpers.getBlockchainExplorer(serviceName),
                    request: request,
                    storage: helpers.getStorage(serviceName)
                }, testConfig, function (s) {
                    servers[serviceName] = s;
                    next();
                });
            }, function (err) {
                should.not.exist(err);
                done();
            });
        });

        it('should create and store wallet', function (done) {
            async.each(Object.keys(Services), function (serviceName, next) {
                const opts = {
                    name: `my ${  serviceName  }wallet`,
                    m: 2,
                    n: 3,
                    pubKey: TestData.keyPair.pub,
                };
                servers[serviceName].createWallet(opts, function (err, walletId) {
                    should.not.exist(err);
                    servers[serviceName].getStorage().fetchWallet(walletId, function (err, wallet) {
                        should.not.exist(err);
                        wallet.id.should.equal(walletId);
                        wallet.name.should.equal(`my ${  serviceName  }wallet`);
                        next();
                    });
                });
            }, function (err) {
                should.not.exist(err);
                done();
            });
        });
    });

});
