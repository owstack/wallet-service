const chai = require('chai');
const should = chai.should();

const Service = require('../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const owsCommon = require('@owstack/ows-common');
const Utils = WalletService.Common.Utils;
const lodash = owsCommon.deps.lodash;

describe('Utils', function () {

    describe('#getMissingFields', function () {
        it('should check required fields', function () {
            const obj = {
                id: 'id',
                name: 'name',
                array: ['a', 'b'],
            };
            const fixtures = [{
                args: 'id',
                check: [],
            }, {
                args: ['id'],
                check: []
            }, {
                args: ['id, name'],
                check: ['id, name'],
            }, {
                args: ['id', 'name'],
                check: []
            }, {
                args: 'array',
                check: []
            }, {
                args: 'dummy',
                check: ['dummy']
            }, {
                args: ['dummy1', 'dummy2'],
                check: ['dummy1', 'dummy2']
            }, {
                args: ['id', 'dummy'],
                check: ['dummy']
            }];
            lodash.each(fixtures, function (f) {
                Utils.getMissingFields(obj, f.args).should.deep.equal(f.check);
            });
        });

        it('should fail to check required fields on non-object', function () {
            const obj = 'dummy';
            Utils.getMissingFields(obj, 'name').should.deep.equal(['name']);
        });
    });

    describe('#hashMessage', function () {
        it('should create a hash', function () {
            const res = Utils.hashMessage('hola');
            res.toString('hex').should.equal('4102b8a140ec642feaa1c645345f714bc7132d4fd2f7f6202db8db305a96172f');
        });
    });

    describe('#verifyMessage', function () {
        it('should fail to verify a malformed signature', function () {
            const res = Utils.verifyMessage('hola', 'badsignature', '02555a2d45e309c00cc8c5090b6ec533c6880ab2d3bc970b3943def989b3373f16');
            should.exist(res);
            res.should.equal(false);
        });

        it('should fail to verify a null signature', function () {
            const res = Utils.verifyMessage('hola', null, '02555a2d45e309c00cc8c5090b6ec533c6880ab2d3bc970b3943def989b3373f16');
            should.exist(res);
            res.should.equal(false);
        });

        it('should fail to verify with wrong pubkey', function () {
            const res = Utils.verifyMessage('hola', '3045022100d6186930e4cd9984e3168e15535e2297988555838ad10126d6c20d4ac0e74eb502201095a6319ea0a0de1f1e5fb50f7bf10b8069de10e0083e23dbbf8de9b8e02785', '02555a2d45e309c00cc8c5090b6ec533c6880ab2d3bc970b3943def989b3373f16');
            should.exist(res);
            res.should.equal(false);
        });

        it('should verify', function () {
            const res = Utils.verifyMessage('hola', '3045022100d6186930e4cd9984e3168e15535e2297988555838ad10126d6c20d4ac0e74eb502201095a6319ea0a0de1f1e5fb50f7bf10b8069de10e0083e23dbbf8de9b8e02785', '03bec86ad4a8a91fe7c11ec06af27246ec55094db3d86098b7d8b2f12afe47627f');
            should.exist(res);
            res.should.equal(true);
        });
    });

    describe('#formatAmount', function () {
        it('should successfully format amount', function () {
            const cases = [{
                args: [1, 'bit', {
                    includeUnits: false
                }],
                expected: '0'
            }, {
                args: [1, 'BTC', {
                    includeUnits: false
                }],
                expected: '0.00'
            }, {
                args: [400050000, 'BTC', {
                    includeUnits: false
                }],
                expected: '4.0005'
            }, {
                args: [400000000, 'BTC', {
                    includeUnits: false
                }],
                expected: '4.00'
            }, {
                args: [49999, 'BTC', {
                    includeUnits: false
                }],
                expected: '0.0005'
            }, {
                args: [100000000, 'BTC', {
                    includeUnits: false
                }],
                expected: '1.00'
            }, {
                args: [0, 'bit', {
                    includeUnits: false
                }],
                expected: '0'
            }, {
                args: [12345678, 'bit', {
                    includeUnits: false
                }],
                expected: '123,457'
            }, {
                args: [12345678, 'BTC', {
                    includeUnits: false
                }],
                expected: '0.123457'
            }, {
                args: [12345611, 'BTC', {
                    includeUnits: false
                }],
                expected: '0.123456'
            }, {
                args: [1234, 'BTC', {
                    includeUnits: false
                }],
                expected: '0.000012'
            }, {
                args: [1299, 'BTC', {
                    includeUnits: false
                }],
                expected: '0.000013'
            }, {
                args: [1234567899999, 'BTC', {
                    includeUnits: false
                }],
                expected: '12,345.679'
            }, {
                args: [12345678, 'bit', {
                    includeUnits: false,
                    thousandsSeparator: '.'
                }],
                expected: '123.457'
            }, {
                args: [12345678, 'BTC', {
                    includeUnits: false,
                    decimalSeparator: ','
                }],
                expected: '0,123457'
            }, {
                args: [1234567899999, 'BTC', {
                    includeUnits: false,
                    thousandsSeparator: ' ',
                    decimalSeparator: ','
                }],
                expected: '12 345,679'
            }, {
                args: [12345678, 'bit', {
                    includeUnits: true,
                    thousandsSeparator: '.'
                }],
                expected: '123.457 bits'
            }, {
                args: [12345678, 'BTC', {
                    includeUnits: true,
                    decimalSeparator: ','
                }],
                expected: '0,123457 BTC'
            }];

            lodash.each(cases, function (testCase) {
                testCase.args[2] = testCase.args[2] || {};
                testCase.args[2].fullPrecision = false;
                const amount = new Utils().formatAmount(testCase.args[0], testCase.args[1], testCase.args[2]);
                amount.should.equal(testCase.expected);
            });
        });
    });
});
