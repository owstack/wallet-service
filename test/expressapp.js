

const chai = require('chai');
const should = chai.should();
const sinon = require('sinon');

const Service = require('../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const Defaults = WalletService.Common.Defaults;
const http = require('http');
const request = require('request');
const testConfig = require('config');

const proxyquire = require('proxyquire');
const xyExpressApp = '../base-service/lib/expressapp';

describe('ExpressApp', function () {

    describe('#constructor', function () {
        it('will set an express app', function () {
            const TestExpressApp = proxyquire(xyExpressApp, {});
            const express = new TestExpressApp(testConfig);
            should.exist(express.app);
            should.exist(express.app.use);
            should.exist(express.app.enable);
        });
    });

    describe('#start', function () {
        describe('Routes', function () {
            const testPort = 3239;
            const testHost = 'http://127.0.0.1';
            let httpServer;

            function start(ExpressApp, done) {
                const app = new ExpressApp(testConfig);
                httpServer = http.Server(app.app);

                app.start(null, function (err) {
                    should.not.exist(err);
                    httpServer.listen(testPort);
                    done();
                });
            }

            afterEach(function () {
                httpServer.close();

                // Remove wrappers
                if (WalletService.Server.prototype.initialize.restore) {
                    WalletService.Server.prototype.initialize.restore();
                }
                if (WalletService.Server.getInstanceWithAuth.restore) {
                    WalletService.Server.getInstanceWithAuth.restore();
                }
            });

            it('should handle request with valid service param', function (done) {
                const TestExpressApp = require(xyExpressApp);

                start(TestExpressApp, function () {
                    const requestOptions = {
                        url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/version?service=btc`
                    };

                    request(requestOptions, function (err, res, body) {
                        res.statusCode.should.equal(200);
                        res.headers['x-service-version'].should.equal(`ws-${  require('../package').version}`);
                        body.should.contain('serviceVersion');
                        done();
                    });
                });
            });

            it('should not handle request with invalid service param', function (done) {
                const TestExpressApp = require(xyExpressApp);

                start(TestExpressApp, function () {
                    const requestOptions = {
                        url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/version?service=invalid`
                    };

                    request(requestOptions, function (err, res, body) {
                        res.statusCode.should.equal(400);
                        body.should.contain('UNKNOWN_SERVICE');
                        should.not.exist(res.headers['x-service-version']);
                        body.should.not.contain('serviceVersion');
                        done();
                    });
                });
            });

            it('/v1/wallets', function (done) {
                const server = {
                    getStatus: sinon.stub().callsArgWith(1, null, {})
                };

                sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
                sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

                const TestExpressApp = require(xyExpressApp);

                start(TestExpressApp, function () {
                    const requestOptions = {
                        url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/wallets?service=btc`,
                        headers: {
                            'x-identity': 'identity',
                            'x-signature': 'signature'
                        }
                    };

                    request(requestOptions, function (err, res, body) {
                        should.not.exist(err);
                        res.statusCode.should.equal(200);
                        body.should.equal('{}');
                        done();
                    });
                });
            });

            it('/v1/addresses', function (done) {
                const server = {
                    getMainAddresses: sinon.stub().callsArgWith(1, null, {})
                };

                sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
                sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

                const TestExpressApp = proxyquire(xyExpressApp, {});

                start(TestExpressApp, function () {
                    const requestOptions = {
                        url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/addresses?limit=4&reverse=1&service=btc`,
                        headers: {
                            'x-identity': 'identity',
                            'x-signature': 'signature'
                        }
                    };

                    request(requestOptions, function (err, res, body) {
                        should.not.exist(err);
                        res.statusCode.should.equal(200);
                        const args = server.getMainAddresses.getCalls()[0].args[0];
                        args.limit.should.equal(4);
                        args.reverse.should.be.true;
                        done();
                    });
                });
            });

            it('/v1/sendmaxinfo', function (done) {
                const server = {
                    getSendMaxInfo: sinon.stub().callsArgWith(1, null, {
                        amount: 123
                    }),
                };

                sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
                sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

                const TestExpressApp = proxyquire(xyExpressApp, {});

                start(TestExpressApp, function () {
                    const requestOptions = {
                        url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/sendmaxinfo?feePerKb=10000&returnInputs=1&service=btc`,
                        headers: {
                            'x-identity': 'identity',
                            'x-signature': 'signature'
                        }
                    };

                    request(requestOptions, function (err, res, body) {
                        should.not.exist(err);
                        res.statusCode.should.equal(200);
                        const args = server.getSendMaxInfo.getCalls()[0].args[0];
                        args.feePerKb.should.equal(10000);
                        args.returnInputs.should.be.true;
                        JSON.parse(body).amount.should.equal(123);
                        done();
                    });
                });
            });

            describe('Balance', function () {
                it('should handle cache argument', function (done) {
                    const server = {
                        getBalance: sinon.stub().callsArgWith(1, null, {})
                    };

                    sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
                    sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

                    const TestExpressApp = proxyquire(xyExpressApp, {});

                    start(TestExpressApp, function () {
                        const reqOpts = {
                            url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/balance?service=btc`,
                            headers: {
                                'x-identity': 'identity',
                                'x-signature': 'signature'
                            }
                        };

                        request(reqOpts, function (err, res, body) {
                            should.not.exist(err);
                            res.statusCode.should.equal(200);
                            const args = server.getBalance.getCalls()[0].args[0];
                            should.not.exist(args.twoStep);

                            reqOpts.url += '&twoStep=1';

                            request(reqOpts, function (err, res, body) {
                                should.not.exist(err);
                                res.statusCode.should.equal(200);
                                const args = server.getBalance.getCalls()[1].args[0];
                                args.twoStep.should.equal(true);
                                done();
                            });
                        });
                    });
                });
            });

            describe('/v1/notifications', function (done) {
                let server; let TestExpressApp; let clock;

                beforeEach(function () {
                    clock = sinon.useFakeTimers(2000000000, 'Date');

                    server = {
                        getNotifications: sinon.stub().callsArgWith(1, null, {})
                    };

                    sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
                    sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

                    TestExpressApp = proxyquire(xyExpressApp, {});
                });

                afterEach(function () {
                    clock.restore();
                });

                it('should fetch notifications from a specified id', function (done) {
                    start(TestExpressApp, function () {
                        const requestOptions = {
                            url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/notifications` + '?notificationId=123&service=btc',
                            headers: {
                                'x-identity': 'identity',
                                'x-signature': 'signature'
                            }
                        };

                        request(requestOptions, function (err, res, body) {
                            should.not.exist(err);
                            res.statusCode.should.equal(200);
                            body.should.equal('{}');
                            server.getNotifications.calledWith({
                                notificationId: '123',
                                minTs: +Date.now() - Defaults.NOTIFICATIONS_TIMESPAN * 1000,
                            }).should.be.true;
                            done();
                        });
                    });
                });

                it('should allow custom minTs within limits', function (done) {
                    start(TestExpressApp, function () {
                        const requestOptions = {
                            url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/notifications` + '?timeSpan=30&service=btc',
                            headers: {
                                'x-identity': 'identity',
                                'x-signature': 'signature'
                            }
                        };

                        request(requestOptions, function (err, res, body) {
                            should.not.exist(err);
                            res.statusCode.should.equal(200);
                            server.getNotifications.calledWith({
                                notificationId: undefined,
                                minTs: +Date.now() - 30000,
                            }).should.be.true;
                            done();
                        });
                    });
                });

                it('should limit minTs to Defaults.MAX_NOTIFICATIONS_TIMESPAN', function (done) {
                    start(TestExpressApp, function () {
                        const overLimit  = Defaults.MAX_NOTIFICATIONS_TIMESPAN * 2;
                        const requestOptions = {
                            url: `${testHost  }:${  testPort  }${testConfig.basePath  }/v1/notifications` + `?timeSpan=${  overLimit  }&service=btc`,
                            headers: {
                                'x-identity': 'identity',
                                'x-signature': 'signature'
                            }
                        };
                        request(requestOptions, function (err, res, body) {
                            should.not.exist(err);
                            res.statusCode.should.equal(200);
                            body.should.equal('{}');

                            server.getNotifications.calledWith({
                                notificationId: undefined,
                                minTs: Date.now() - Defaults.MAX_NOTIFICATIONS_TIMESPAN * 1000, // override minTs argument
                            }).should.be.true;
                            done();
                        });
                    });
                });
            });
        });
    });
});
