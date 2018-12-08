'use strict';

var chai = require('chai');
var should = chai.should();
var sinon = require('sinon');

var Service = require('../');
var WalletService = Service.BTC.WalletService;

var config = require('../base-service/config');
var Defaults = WalletService.Common.Defaults;
var http = require('http');
var request = require('request');

var proxyquire = require('proxyquire');
var xyExpressApp = '../base-service/lib/expressapp';

describe('ExpressApp', function() {

  describe('#constructor', function() {
    it('will set an express app', function() {
      var TestExpressApp = proxyquire(xyExpressApp, {});
      var express = new TestExpressApp(config);
      should.exist(express.app);
      should.exist(express.app.use);
      should.exist(express.app.enable);
    });
  });

  describe('#start', function() {
    describe('Routes', function() {
      var testPort = 3239;
      var testHost = 'http://127.0.0.1';
      var httpServer;

      function start(ExpressApp, done) {
        var app = new ExpressApp(config);
        httpServer = http.Server(app.app);

        app.start(function(err) {
          should.not.exist(err);
          httpServer.listen(testPort);
          done();
        });
      };

      afterEach(function() {
        httpServer.close();

        // Remove wrappers
        if (WalletService.Server.prototype.initialize.restore) {
          WalletService.Server.prototype.initialize.restore();
        }
        if (WalletService.Server.getInstanceWithAuth.restore) {
          WalletService.Server.getInstanceWithAuth.restore();
        }
      });

      it('should handle request with valid x-service header', function(done) {
        var TestExpressApp = require(xyExpressApp);

        start(TestExpressApp, function() {
          var requestOptions = {
            url: testHost + ':' + testPort + config.basePath + '/v1/version',
            headers: {
              'x-service': 'BTC'
            }
          };

          request(requestOptions, function(err, res, body) {
            res.statusCode.should.equal(200);
            res.headers['x-service-version'].should.equal('ws-' + require('../package').version);
            body.should.contain('serviceVersion');
            done();
          });
        });
      });

      it('should not handle request with invalid x-service header', function(done) {
        var TestExpressApp = require(xyExpressApp);

        start(TestExpressApp, function() {
          var requestOptions = {
            url: testHost + ':' + testPort + config.basePath + '/v1/version',
            headers: {
              'x-service': 'invalid'
            }
          };

          request(requestOptions, function(err, res, body) {
            res.statusCode.should.equal(400);
            body.should.contain('UNKNOWN_SERVICE');
            should.not.exist(res.headers['x-service-version']);
            body.should.not.contain('serviceVersion');
            done();
          });
        });
      });

      it('/v1/wallets', function(done) {
        var server = {
          getStatus: sinon.stub().callsArgWith(1, null, {})
        };

        sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
        sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

        var TestExpressApp = require(xyExpressApp);

        start(TestExpressApp, function() {
          var requestOptions = {
            url: testHost + ':' + testPort + config.basePath + '/v1/wallets',
            headers: {
              'x-identity': 'identity',
              'x-signature': 'signature',
              'x-service': 'BTC'
            }
          };

          request(requestOptions, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            body.should.equal('{}');
            done();
          });
        });
      });

      it('/v1/addresses', function(done) {
        var server = {
          getMainAddresses: sinon.stub().callsArgWith(1, null, {})
        };

        sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
        sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

        var TestExpressApp = proxyquire(xyExpressApp, {});

        start(TestExpressApp, function() {
          var requestOptions = {
            url: testHost + ':' + testPort + config.basePath + '/v1/addresses?limit=4&reverse=1',
            headers: {
              'x-identity': 'identity',
              'x-signature': 'signature',
              'x-service': 'BTC'
            }
          };

          request(requestOptions, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            var args = server.getMainAddresses.getCalls()[0].args[0];
            args.limit.should.equal(4);
            args.reverse.should.be.true;
            done();
          });
        });
      });

      it('/v1/sendmaxinfo', function(done) {
        var server = {
          getSendMaxInfo: sinon.stub().callsArgWith(1, null, {
            amount: 123
          }),
        };

        sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
        sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

        var TestExpressApp = proxyquire(xyExpressApp, {});

        start(TestExpressApp, function() {
          var requestOptions = {
            url: testHost + ':' + testPort + config.basePath + '/v1/sendmaxinfo?feePerKb=10000&returnInputs=1',
            headers: {
              'x-identity': 'identity',
              'x-signature': 'signature',
              'x-service': 'BTC'
            }
          };

          request(requestOptions, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            var args = server.getSendMaxInfo.getCalls()[0].args[0];
            args.feePerKb.should.equal(10000);
            args.returnInputs.should.be.true;
            JSON.parse(body).amount.should.equal(123);
            done();
          });
        });
      });

      describe('Balance', function() {
        it('should handle cache argument', function(done) {
          var server = {
            getBalance: sinon.stub().callsArgWith(1, null, {}),
          };

          sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
          sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

          var TestExpressApp = proxyquire(xyExpressApp, {});

          start(TestExpressApp, function() {
            var reqOpts = {
              url: testHost + ':' + testPort + config.basePath + '/v1/balance',
              headers: {
                'x-identity': 'identity',
                'x-signature': 'signature',
                'x-service': 'BTC'
              }
            };

            request(reqOpts, function(err, res, body) {
              should.not.exist(err);
              res.statusCode.should.equal(200);
              var args = server.getBalance.getCalls()[0].args[0];
              should.not.exist(args.twoStep);

              reqOpts.url += '?twoStep=1';

              request(reqOpts, function(err, res, body) {
                should.not.exist(err);
                res.statusCode.should.equal(200);
                var args = server.getBalance.getCalls()[1].args[0];
                args.twoStep.should.equal(true);
                done();
              });
            });
          });
        });
      });

      describe('/v1/notifications', function(done) {
        var server, TestExpressApp, clock;

        beforeEach(function() {
          clock = sinon.useFakeTimers(2000000000, 'Date');

          server = {
            getNotifications: sinon.stub().callsArgWith(1, null, {})
          };

          sinon.stub(WalletService.Server.prototype, 'initialize').callsArg(1);
          sinon.stub(WalletService.Server, 'getInstanceWithAuth').callsArgWith(3, null, server);

          TestExpressApp = proxyquire(xyExpressApp, {});
        });

        afterEach(function() {
          clock.restore();
        });

        it('should fetch notifications from a specified id', function(done) {
          start(TestExpressApp, function() {
            var requestOptions = {
              url: testHost + ':' + testPort + config.basePath + '/v1/notifications' + '?notificationId=123',
              headers: {
                'x-identity': 'identity',
                'x-signature': 'signature',
                'x-service': 'BTC'
              }
            };

            request(requestOptions, function(err, res, body) {
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

        it('should allow custom minTs within limits', function(done) {
          start(TestExpressApp, function() {
            var requestOptions = {
              url: testHost + ':' + testPort + config.basePath + '/v1/notifications' + '?timeSpan=30',
              headers: {
                'x-identity': 'identity',
                'x-signature': 'signature',
                'x-service': 'BTC'
              }
            };

            request(requestOptions, function(err, res, body) {
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

        it('should limit minTs to Defaults.MAX_NOTIFICATIONS_TIMESPAN', function(done) {
          start(TestExpressApp, function() {
            var overLimit  = Defaults.MAX_NOTIFICATIONS_TIMESPAN * 2;
            var requestOptions = {
              url: testHost + ':' + testPort + config.basePath + '/v1/notifications' + '?timeSpan=' + overLimit ,
              headers: {
                'x-identity': 'identity',
                'x-signature': 'signature',
                'x-service': 'BTC'
              }
            };
            request(requestOptions, function(err, res, body) {
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
