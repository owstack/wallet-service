const should = require('chai').should();
const sinon = require('sinon');

const Service = require('../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const BlockchainMonitor = WalletService.BlockchainMonitor;
const EmailService = WalletService.EmailService;
const ExpressApp = WalletService.ExpressApp;
const fs = require('fs');
const http = require('http');
const https = require('https');
const io = require('socket.io');
const Locker = require('locker-server');
const Node = Service.BTC.Node;
const testConfig = require('config');

describe('Node Service', function () {

    describe('#constructor', function () {
        it('https settings from node', function () {
            const opts = {
                https: true,
                httpsOptions: {
                    key: 'key',
                    cert: 'cert'
                }
            };
            const service = new Node(testConfig, opts);
            service.https.should.equal(true);
            service.httpsOptions.should.deep.equal({
                key: 'key',
                cert: 'cert'
            });
            service.wsPort.should.equal(3232);
            service.messageBrokerPort.should.equal(3380);
            service.lockerPort.should.equal(3231);
        });

        it('direct https options', function () {
            const opts = {
                https: true,
                httpsOptions: {
                    key: 'key',
                    cert: 'cert'
                }
            };
            const service = new Node(testConfig, opts);
            service.https.should.equal(true);
            service.httpsOptions.should.deep.equal({
                key: 'key',
                cert: 'cert'
            });
            service.wsPort.should.equal(3232);
            service.messageBrokerPort.should.equal(3380);
            service.lockerPort.should.equal(3231);
        });

        it('can set custom ports', function () {
            const opts = {
                wsPort: 1000,
                messageBrokerPort: 1001,
                lockerPort: 1002
            };
            const service = new Node(testConfig, opts);
            service.wsPort.should.equal(1000);
            service.messageBrokerPort.should.equal(1001);
            service.lockerPort.should.equal(1002);
        });
    });

    describe('#readHttpsOptions', function () {
        it('will create server options from httpsOptions', function () {
            sinon.stub(fs, 'readFileSync').returnsArg(0);

            const opts = {
                https: true,
                httpsOptions: {
                    key: 'key',
                    cert: 'cert',
                    CAinter1: 'CAinter1',
                    CAinter2: 'CAinter2',
                    CAroot: 'CAroot'
                }
            };

            const service = new Node(testConfig, opts);
            const serverOptions = service._readHttpsOptions();
            serverOptions.key.should.equal('key');
            serverOptions.cert.should.equal('cert');
            serverOptions.ca[0].should.equal('CAinter1');
            serverOptions.ca[1].should.equal('CAinter2');
            serverOptions.ca[2].should.equal('CAroot');
        });
    });

    describe('#_startWalletService', function () {
        it('error from express', function (done) {
            const orig_ExpressAppPrototypeStart = ExpressApp.prototype.start;
            ExpressApp.prototype.start = sinon.stub().callsArgWith(1, new Error('test'));
            const opts = {
                wsPort: 3232
            };
            const service = new Node(testConfig, opts);
            const config = {
                basePath: 'ws/api'
            };
            service._startWalletService(config, function (err) {
                err.message.should.equal('test');
                ExpressApp.prototype.start = orig_ExpressAppPrototypeStart;
                done();
            });
        });

        it('error from server.listen', function (done) {
            const listen = sinon.stub().callsArgWith(1, new Error('test'));
            const httpServerStub = sinon.stub(http, 'Server').returns({listen: listen});
            const opts = {
                wsPort: 3232
            };
            const service = new Node(testConfig, opts);
            const config = {
                basePath: 'ws/api'
            };
            service._startWalletService(config, function (err) {
                err.message.should.equal('test');
                httpServerStub.restore();
                done();
            });
        });

        it('will enable https', function (done) {
            const httpsOptions = {};
            const listen = sinon.stub().callsArg(1);
            sinon.stub(https, 'createServer').returns({listen: listen});
            const opts = {
                https: true,
                wsPort: 3232
            };
            const service = new Node(testConfig, opts);
            service._readHttpsOptions = sinon.stub().returns(httpsOptions);
            const config = {
                basePath: 'ws/api'
            };
            service._startWalletService(config, function (err) {
                service._readHttpsOptions.callCount.should.equal(1);
                listen.callCount.should.equal(1);
                done();
            });
        });
    });

    describe('#start', function (done) {
        it('error from blockchain monitor', function (done) {
            const orig_BlockchainMonitorPrototypeStart = BlockchainMonitor.prototype.start;
            BlockchainMonitor.prototype.start = sinon.stub().callsArgWith(1, new Error('test'));

            const orig_EmailServicePrototypeStart = EmailService.prototype.start;
            EmailService.prototype.start = sinon.stub();

            const orig_LockerPrototypeListen = Locker.prototype.listen;
            Locker.prototype.listen = sinon.stub();

            const ioAttach = sinon.stub(io.prototype, 'attach');
            const ioOnconnection = sinon.stub(io.prototype, 'onconnection').returns({
                on: sinon.stub()
            });

            const opts = {};
            const service = new Node(testConfig, opts);
            const config = {};
            service._getConfiguration = sinon.stub().returns(config);
            service._startWalletService = sinon.stub().callsArg(1);
            service.start(function (err) {
                err.message.should.equal('test');
                BlockchainMonitor.prototype.start = orig_BlockchainMonitorPrototypeStart;
                Locker.prototype.listen = orig_LockerPrototypeListen;
                EmailService.prototype.start = orig_EmailServicePrototypeStart;
                ioOnconnection.restore();
                ioAttach.restore();
                done();
            });
        });

        it('error from email service', function (done) {
            const orig_BlockchainMonitorPrototypeStart = BlockchainMonitor.prototype.start;
            BlockchainMonitor.prototype.start = sinon.stub().callsArgWith(1);

            const orig_EmailServicePrototypeStart = EmailService.prototype.start;
            EmailService.prototype.start = sinon.stub().callsArgWith(1, new Error('test'));

            const orig_LockerPrototypeListen = Locker.prototype.listen;
            Locker.prototype.listen = sinon.stub();

            const ioAttach = sinon.stub(io.prototype, 'attach');
            const ioOnconnection = sinon.stub(io.prototype, 'onconnection').returns({
                on: sinon.stub()
            });

            const opts = {};
            testConfig.BTC.emailOpts = {};
            const service = new Node(testConfig, opts);
            service._getConfiguration = sinon.stub().returns({
                emailOpts: {}
            });
            service._startWalletService = sinon.stub().callsArg(1);
            service.start(function (err) {
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
