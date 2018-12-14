'use strict';

var should = require('chai').should();
var sinon = require('sinon');

var Service = require('../');
var serviceName = 'BTC';
var WalletService = Service[serviceName].WalletService;

var BlockchainMonitor = WalletService.BlockchainMonitor;
var EmailService = WalletService.EmailService;
var ExpressApp = WalletService.ExpressApp;
var fs = require('fs');
var http = require('http');
var https = require('https');
var io = require('socket.io');
var Locker = require('locker-server');
var Node = Service.BTC.Node;
var testConfig = require('./testconfig');

describe('Node Service', function() {

  describe('#constructor', function() {
    it('https settings from node', function() {
      var opts = {
        https: true,
        httpsOptions: {
          key: 'key',
          cert: 'cert'
        }
      };
      var service = new Node(testConfig, opts);
      service.https.should.equal(true);
      service.httpsOptions.should.deep.equal({
        key: 'key',
        cert: 'cert'
      });
      service.wsPort.should.equal(3232);
      service.messageBrokerPort.should.equal(3380);
      service.lockerPort.should.equal(3231);
    });

    it('direct https options', function() {
      var opts = {
        https: true,
        httpsOptions: {
          key: 'key',
          cert: 'cert'
        }
      };
      var service = new Node(testConfig, opts);
      service.https.should.equal(true);
      service.httpsOptions.should.deep.equal({
        key: 'key',
        cert: 'cert'
      });
      service.wsPort.should.equal(3232);
      service.messageBrokerPort.should.equal(3380);
      service.lockerPort.should.equal(3231);
    });

    it('can set custom ports', function() {
      var opts = {
        wsPort: 1000,
        messageBrokerPort: 1001,
        lockerPort: 1002
      };
      var service = new Node(testConfig, opts);
      service.wsPort.should.equal(1000);
      service.messageBrokerPort.should.equal(1001);
      service.lockerPort.should.equal(1002);
    });
  });

  describe('#readHttpsOptions', function() {
    it('will create server options from httpsOptions', function() {
      sinon.stub(fs, 'readFileSync').returnsArg(0);

      var opts = {
        https: true,
        httpsOptions: {
          key: 'key',
          cert: 'cert',
          CAinter1: 'CAinter1',
          CAinter2: 'CAinter2',
          CAroot: 'CAroot'
        }
      };

      var service = new Node(testConfig, opts);
      var serverOptions = service._readHttpsOptions();
      serverOptions.key.should.equal('key');
      serverOptions.cert.should.equal('cert');
      serverOptions.ca[0].should.equal('CAinter1');
      serverOptions.ca[1].should.equal('CAinter2');
      serverOptions.ca[2].should.equal('CAroot');
    });
  });

  describe('#_startWalletService', function() {
    it('error from express', function(done) {
      var orig_ExpressAppPrototypeStart = ExpressApp.prototype.start;
      ExpressApp.prototype.start = sinon.stub().callsArgWith(1, new Error('test'));
      var opts = {
        wsPort: 3232
      };
      var service = new Node(testConfig, opts);
      var config = {};
      service._startWalletService(config, function(err) {
        err.message.should.equal('test');
        ExpressApp.prototype.start = orig_ExpressAppPrototypeStart;
        done();
      });
    });

    it('error from server.listen', function(done) {
      var listen = sinon.stub().callsArgWith(1, new Error('test'));
      var httpServerStub = sinon.stub(http, 'Server').returns({listen: listen});
      var opts = {
        wsPort: 3232
      };
      var service = new Node(testConfig, opts);
      var config = {};
      service._startWalletService(config, function(err) {
        err.message.should.equal('test');
        httpServerStub.restore();
        done();
      });
    });

    it('will enable https', function(done) {
      var httpsOptions = {};
      var listen = sinon.stub().callsArg(1);
      sinon.stub(https, 'createServer').returns({listen: listen});
      var opts = {
        https: true,
        wsPort: 3232
      };
      var service = new Node(testConfig, opts);
      service._readHttpsOptions = sinon.stub().returns(httpsOptions);
      var config = {};
      service._startWalletService(config, function(err) {
        service._readHttpsOptions.callCount.should.equal(1);
        listen.callCount.should.equal(1);
        done();
      });
    });
  });

  describe('#start', function(done) {
    it('error from blockchain monitor', function(done) {
      var orig_BlockchainMonitorPrototypeStart = BlockchainMonitor.prototype.start;
      BlockchainMonitor.prototype.start = sinon.stub().callsArgWith(1, new Error('test'));

      var orig_EmailServicePrototypeStart = EmailService.prototype.start;
      EmailService.prototype.start = sinon.stub();

      var orig_LockerPrototypeListen = Locker.prototype.listen;
      Locker.prototype.listen = sinon.stub();

      var ioAttach = sinon.stub(io.prototype, 'attach');
      var ioOnconnection = sinon.stub(io.prototype, 'onconnection').returns({
        on: sinon.stub()
      });

      var opts = {};
      var service = new Node(testConfig, opts);
      var config = {};
      service._getConfiguration = sinon.stub().returns(config);
      service._startWalletService = sinon.stub().callsArg(1);
      service.start(function(err) {
        err.message.should.equal('test');
        BlockchainMonitor.prototype.start = orig_BlockchainMonitorPrototypeStart;
        Locker.prototype.listen = orig_LockerPrototypeListen;
        EmailService.prototype.start = orig_EmailServicePrototypeStart;
        ioOnconnection.restore();
        ioAttach.restore();
        done();
      });
    });

    it('error from email service', function(done) {
      var orig_BlockchainMonitorPrototypeStart = BlockchainMonitor.prototype.start;
      BlockchainMonitor.prototype.start = sinon.stub().callsArgWith(1);

      var orig_EmailServicePrototypeStart = EmailService.prototype.start;
      EmailService.prototype.start = sinon.stub().callsArgWith(1, new Error('test'));

      var orig_LockerPrototypeListen = Locker.prototype.listen;
      Locker.prototype.listen = sinon.stub();

      var ioAttach = sinon.stub(io.prototype, 'attach');
      var ioOnconnection = sinon.stub(io.prototype, 'onconnection').returns({
        on: sinon.stub()
      });

      var opts = {};
      testConfig.BTC.emailOpts = {};
      var service = new Node(testConfig, opts);
      service._getConfiguration = sinon.stub().returns({
        emailOpts: {}
      });
      service._startWalletService = sinon.stub().callsArg(1);
      service.start(function(err) {
        err.message.should.equal('test');
        BlockchainMonitor.prototype.start = orig_BlockchainMonitorPrototypeStart;
        Locker.prototype.listen = orig_LockerPrototypeListen;
        EmailService.prototype.start = orig_EmailServicePrototypeStart;
        ioOnconnection.restore();
        ioAttach.restore();
        done();
      });
    });
  });
});
