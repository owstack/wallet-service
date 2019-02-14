const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const async = require('async');
const FiatRateService = WalletService.FiatRateService;
const helpers = require('./helpers');
const log = require('npmlog');
const testConfig = require('config');

log.debug = log.verbose;
log.level = 'info';

describe('Fiat rate service', function () {
    let service; let request;

    before(function (done) {
        helpers.before(serviceName, done);
    });

    after(function (done) {
        done();
    });

    beforeEach(function (done) {
        helpers.beforeEach(serviceName, function () {
            service = new FiatRateService(testConfig);
            request = sinon.stub();
            request.get = sinon.stub();
            service.init({
                storage: helpers.getStorage(serviceName),
                request: request
            }, function (err) {
                should.not.exist(err);
                service.startCron(done);
            });
        });
    });

    describe('#getRate', function () {
        it('should get current rate', function (done) {
            service.storage.storeFiatRate('OpenWalletStack', [{
                code: 'USD',
                value: 123.45,
            }], function (err) {
                should.not.exist(err);
                service.getRate({
                    code: 'USD'
                }, function (err, res) {
                    should.not.exist(err);
                    res.rate.should.equal(123.45);
                    done();
                });
            });
        });

        it('should get current rate for different currency', function (done) {
            service.storage.storeFiatRate('OpenWalletStack', [{
                code: 'USD',
                value: 123.45,
            }], function (err) {
                should.not.exist(err);
                service.storage.storeFiatRate('OpenWalletStack', [{
                    code: 'EUR',
                    value: 345.67,
                }], function (err) {
                    should.not.exist(err);
                    service.getRate({
                        code: 'EUR'
                    }, function (err, res) {
                        should.not.exist(err);
                        res.rate.should.equal(345.67);
                        done();
                    });
                });
            });
        });

        it('should get current rate for different provider', function (done) {
            service.storage.storeFiatRate('OpenWalletStack', [{
                code: 'USD',
                value: 100.00,
            }], function (err) {
                should.not.exist(err);
                service.storage.storeFiatRate('Bitstamp', [{
                    code: 'USD',
                    value: 200.00,
                }], function (err) {
                    should.not.exist(err);
                    service.getRate({
                        code: 'USD'
                    }, function (err, res) {
                        should.not.exist(err);
                        res.rate.should.equal(100.00, 'Should use default provider');
                        service.getRate({
                            code: 'USD',
                            provider: 'Bitstamp',
                        }, function (err, res) {
                            should.not.exist(err);
                            res.rate.should.equal(200.00);
                            done();
                        });
                    });
                });
            });
        });

        it('should get rate for specific ts', function (done) {
            const clock = sinon.useFakeTimers(0, 'Date');
            clock.tick(20);
            service.storage.storeFiatRate('OpenWalletStack', [{
                code: 'USD',
                value: 123.45,
            }], function (err) {
                should.not.exist(err);
                clock.tick(100);
                service.storage.storeFiatRate('OpenWalletStack', [{
                    code: 'USD',
                    value: 345.67,
                }], function (err) {
                    should.not.exist(err);
                    service.getRate({
                        code: 'USD',
                        ts: 50,
                    }, function (err, res) {
                        should.not.exist(err);
                        res.ts.should.equal(50);
                        res.rate.should.equal(123.45);
                        res.fetchedOn.should.equal(20);
                        clock.restore();
                        done();
                    });
                });
            });
        });

        it('should get rates for a series of ts', function (done) {
            const clock = sinon.useFakeTimers(0, 'Date');
            async.each([1.00, 2.00, 3.00, 4.00], function (value, next) {
                clock.tick(100);
                service.storage.storeFiatRate('OpenWalletStack', [{
                    code: 'USD',
                    value: value,
                }, {
                    code: 'EUR',
                    value: value,
                }], next);
            }, function (err) {
                should.not.exist(err);
                service.getRate({
                    code: 'USD',
                    ts: [50, 100, 199, 500],
                }, function (err, res) {
                    should.not.exist(err);
                    res.length.should.equal(4);

                    res[0].ts.should.equal(50);
                    should.not.exist(res[0].rate);
                    should.not.exist(res[0].fetchedOn);

                    res[1].ts.should.equal(100);
                    res[1].rate.should.equal(1.00);
                    res[1].fetchedOn.should.equal(100);

                    res[2].ts.should.equal(199);
                    res[2].rate.should.equal(1.00);
                    res[2].fetchedOn.should.equal(100);

                    res[3].ts.should.equal(500);
                    res[3].rate.should.equal(4.00);
                    res[3].fetchedOn.should.equal(400);

                    clock.restore();
                    done();
                });
            });
        });

        it('should not get rate older than 2hs', function (done) {
            const clock = sinon.useFakeTimers(0, 'Date');
            service.storage.storeFiatRate('OpenWalletStack', [{
                code: 'USD',
                value: 123.45,
            }], function (err) {
                should.not.exist(err);
                clock.tick(24 * 3600 * 1000); // Some time in the future
                service.getRate({
                    ts: 2 * 3600 * 1000 - 1, // almost 2 hours
                    code: 'USD',
                }, function (err, res) {
                    should.not.exist(err);
                    res.rate.should.equal(123.45);
                    res.fetchedOn.should.equal(0);
                    service.getRate({
                        ts: 2 * 3600 * 1000 + 1, // just past 2 hours
                        code: 'USD',
                    }, function (err, res) {
                        should.not.exist(err);
                        should.not.exist(res.rate);
                        clock.restore();
                        done();
                    });
                });
            });
        });

    });

    describe('#fetch', function () {
        it('should fetch rates from all providers', function (done) {
            const clock = sinon.useFakeTimers(100, 'Date');
            const bitpay = [{
                code: 'USD',
                rate: 123.45,
            }, {
                code: 'EUR',
                rate: 234.56,
            }];
            const bitstamp = {
                last: 120.00,
            };
            const openwalletstack = [{
                code: 'USD',
                rate: 123.45,
            }, {
                code: 'EUR',
                rate: 234.56,
            }];
            request.get.withArgs({
                url: 'https://bitpay.com/api/rates/',
                json: true
            }).yields(null, null, bitpay);
            request.get.withArgs({
                url: 'https://www.bitstamp.net/api/ticker/',
                json: true
            }).yields(null, null, bitstamp);
            request.get.withArgs({
                url: 'http://rates.owstack.org/buy/gdax,bitstamp/btcusd/1',
                json: true
            }).yields(null, null, openwalletstack);

            service._fetch(function (err) {
                should.not.exist(err);
                service.getRate({
                    code: 'USD'
                }, function (err, res) {
                    should.not.exist(err);
                    res.fetchedOn.should.equal(100);
                    res.rate.should.equal(123.45);
                    service.getRate({
                        code: 'USD',
                        provider: 'Bitstamp',
                    }, function (err, res) {
                        should.not.exist(err);
                        res.fetchedOn.should.equal(100);
                        res.rate.should.equal(120.00);
                        service.getRate({
                            code: 'EUR'
                        }, function (err, res) {
                            should.not.exist(err);
                            res.fetchedOn.should.equal(100);
                            res.rate.should.equal(234.56);
                            clock.restore();
                            done();
                        });
                    });
                });
            });
        });

        it('should not stop when failing to fetch provider', function (done) {
            const clock = sinon.useFakeTimers(100, 'Date');
            const bitpay = [{
                code: 'USD',
                rate: 123.45,
            }, {
                code: 'EUR',
                rate: 234.56,
            }];
            const bitstamp = {
                last: 120.00,
            };
            request.get.withArgs({
                url: 'http://rates.owstack.org/buy/gdax,bitstamp/btcusd/1',
                json: true
            }).yields('dummy error', null, null);
            request.get.withArgs({
                url: 'https://www.bitstamp.net/api/ticker/',
                json: true
            }).yields(null, null, bitstamp);
            request.get.withArgs({
                url: 'https://bitpay.com/api/rates/',
                json: true
            }).yields(null, null, bitpay);

            service._fetch(function (err) {
                should.not.exist(err);
                service.getRate({
                    code: 'USD'
                }, function (err, res) {
                    should.not.exist(err);
                    res.ts.should.equal(100);
                    should.not.exist(res.rate);
                    should.not.exist(res.fetchedOn);
                    service.getRate({
                        code: 'USD',
                        provider: 'Bitstamp'
                    }, function (err, res) {
                        should.not.exist(err);
                        res.fetchedOn.should.equal(100);
                        res.rate.should.equal(120.00);
                        clock.restore();
                        done();
                    });
                });
            });
        });
    });
});
