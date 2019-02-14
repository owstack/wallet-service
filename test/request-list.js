const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const RequestList = WalletService.BlockchainExplorers.RequestList;

describe('request-list', function () {
    let request;

    beforeEach(function () {
        request = sinon.stub();
    });

    it('should support url as string', function (done) {
        request.yields(null, {
            statusCode: 200
        }, 'abc');

        new RequestList({
            hosts: 'url1',
            request: request,
        }, function (err, res, body) {
            should.not.exist(err);
            body.should.be.equal('abc');
            res.statusCode.should.be.equal(200);
            done();
        });
    });

    it('should support url as string (500 response)', function (done) {
        request.yields(null, {
            statusCode: 500
        });
        new RequestList({
            hosts: 'url1',
            request: request,
        }, function (err, res) {
            should.not.exist(err);
            res.statusCode.should.be.equal(500);
            done();
        });
    });

    it('should support url as array of strings', function (done) {
        request.yields(null, {
            statusCode: 200
        }, 'abc');
        new RequestList({
            hosts: ['url1', 'url2'],
            request: request,
        }, function (err, res, body) {
            should.not.exist(err);
            body.should.be.equal('abc');
            done();
        });
    });

    it('should try 2nd url if first is unsuccessful (5xx)', function (done) {
        request.onCall(0).yields(null, {
            statusCode: 500
        });
        request.onCall(1).yields(null, {
            statusCode: 550
        });
        new RequestList({
            hosts: ['url1', 'url2'],
            request: request,
        }, function (err, res) {
            should.not.exist(err);
            res.statusCode.should.be.equal(550);
            done();
        });
    });

    it('should query 3th url if first 2 are unsuccessful (5xx)', function (done) {
        request.onCall(0).yields(null, {
            statusCode: 500
        });
        request.onCall(1).yields(null, {
            statusCode: 550
        });
        request.onCall(2).yields(null, {
            statusCode: 200,
        }, 'abc');
        new RequestList({
            hosts: ['url1', 'url2', 'url3'],
            request: request,
        }, function (err, res, body) {
            should.not.exist(err);
            body.should.be.equal('abc');
            done();
        });
    });

    it('should query only the first url if response is 404', function (done) {
        request.onCall(0).yields(null, {
            statusCode: 404
        });
        request.onCall(1).yields(null, {
            statusCode: 550
        });
        new RequestList({
            hosts: ['url1', 'url2'],
            request: request,
        }, function (err, res) {
            should.not.exist(err);
            res.statusCode.should.be.equal(404);
            done();
        });
    });

    it('should query only the first 2 urls if the second is successful (5xx)', function (done) {
        request.onCall(0).yields(null, {
            statusCode: 500
        });
        request.onCall(1).yields(null, {
            statusCode: 200,
        }, '2nd');
        request.onCall(2).yields(null, {
            statusCode: 200,
        }, 'abc');
        new RequestList({
            hosts: ['url1', 'url2', 'url3'],
            request: request,
        }, function (err, res, body) {
            should.not.exist(err);
            body.should.be.equal('2nd');
            res.statusCode.should.be.equal(200);
            done();
        });
    });

    it('should query only the first 2 urls if the second is successful (timeout)', function (done) {
        request.onCall(0).yields({
            code: 'ETIMEDOUT',
            connect: true
        });
        request.onCall(1).yields(null, {
            statusCode: 200,
        }, '2nd');
        request.onCall(2).yields(null, {
            statusCode: 200,
        }, 'abc');
        new RequestList({
            hosts: ['url1', 'url2', 'url3'],
            request: request,
        }, function (err, res, body) {
            should.not.exist(err);
            body.should.be.equal('2nd');
            res.statusCode.should.be.equal(200);
            done();
        });
    });

    it('should use the latest response if all requests are unsuccessful', function (done) {
        request.onCall(0).yields({
            code: 'ETIMEDOUT',
            connect: true
        });
        request.onCall(1).yields(null, {
            statusCode: 505,
        }, '2nd');
        request.onCall(2).yields(null, {
            statusCode: 510,
        }, 'abc');
        new RequestList({
            hosts: ['url1', 'url2', 'url3'],
            request: request,
        }, function (err, res) {
            should.not.exist(err);
            res.statusCode.should.be.equal(510);
            done();
        });
    });
});
