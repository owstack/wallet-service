

const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const BlockchainExplorer = WalletService.BlockchainExplorer;

describe('Blockchain explorer', function () {
    describe('#constructor', function () {
        it('should return a blockchain explorer with basic methods', function () {
            var exp = new BlockchainExplorer({
                provider: 'explorer',
                networkName: 'testnet'
            });
            should.exist(exp);
            exp.should.respondTo('broadcast');
            exp.should.respondTo('getUtxos');
            exp.should.respondTo('getTransactions');
            exp.should.respondTo('getAddressActivity');
            exp.should.respondTo('estimateFee');
            exp.should.respondTo('initSocket');
            var exp = new BlockchainExplorer({
                provider: 'explorer',
                networkName: 'btc'
            });
            should.exist(exp);
        });
        it('should fail on unsupported provider', function () {
            (function () {
                const exp = new BlockchainExplorer({
                    provider: 'dummy'
                });
            }).should.throw('not supported');
        });
    });
});
