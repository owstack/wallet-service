const chai = require('chai');
const should = chai.should();

const Service = require('../../');
const serviceName = 'BTC';
const WalletService = Service[serviceName].WalletService;

const btcLib = require('@owstack/btc-lib');
const Address = WalletService.Model.Address;
const Networks = btcLib.Networks;

const LIVENET = Networks.livenet;
const TESTNET = Networks.testnet;

describe('Address', function () {
    describe('#create', function () {

        it('should create livenet address', function () {
            const x = Address.create({
                address: '3KxttbKQQPWmpsnXZ3rB4mgJTuLnVR7frg',
                walletId: '123',
                isChange: false,
                path: 'm/0/1',
                publicKeys: ['123', '456'],
            });
            should.exist(x.createdOn);
            x.networkName.should.equal(LIVENET.name);
        });

        it('should create testnet address', function () {
            const x = Address.create({
                address: 'mp5xaa4uBj16DJt1fuA3D9fejHuCzeb7hj',
                walletId: '123',
                isChange: false,
                path: 'm/0/1',
                publicKeys: ['123', '456'],
            });
            x.networkName.should.equal(TESTNET.name);
        });
    });

    describe('#derive', function () {
        it('should derive multi-sig P2SH address', function () {
            const address = new Address().derive('wallet-id', 'P2SH', [{
                xPubKey: 'xpub686v8eJUJEqxzAtkWPyQ9nvpBHfucVsB8Q8HQHw5mxYPQtBact2rmA8wRXFYaVESK8f7WrxeU4ayALaEhicdXCX5ZHktNeRFnvFeffztiY1'
                // PubKey(xPubKey/0/0) -> 03fe466ea829aa4c9a1c289f9ba61ebc26a61816500860c8d23f94aad9af152ecd
            }, {
                xPubKey: 'xpub68tpbrfk747AvDUCdtEUgK2yDPmtGKf7YXzEcUUqnF3jmAMeZgcpoZqgXwwoi8CpwDkyzVX6wxUktTw2wh9EhhVjh5S71MLL3FkZDGF5GeY'
                // PubKey(xPubKey/0/0) -> 03162179906dbe6a67979d4f8f46ee1db6ff81715f465e6615a4f5969478ad2171
            }], 'm/0/0', 1, LIVENET.name, false);
            should.exist(address);
            address.walletId.should.equal('wallet-id');
            address.address.should.equal('3QN2CiSxcUsFuRxZJwXMNDQ2esnr5RXTvw');
            address.networkName.should.equal(LIVENET.name);
            address.isChange.should.be.false;
            address.path.should.equal('m/0/0');
            address.type.should.equal('P2SH');
        });

        it('should derive 1-of-1 P2SH address', function () {
            const address = new Address().derive('wallet-id', 'P2SH', [{
                xPubKey: 'xpub686v8eJUJEqxzAtkWPyQ9nvpBHfucVsB8Q8HQHw5mxYPQtBact2rmA8wRXFYaVESK8f7WrxeU4ayALaEhicdXCX5ZHktNeRFnvFeffztiY1'
                // PubKey(xPubKey/0/0) -> 03fe466ea829aa4c9a1c289f9ba61ebc26a61816500860c8d23f94aad9af152ecd
            }], 'm/0/0', 1, LIVENET.name, false);
            should.exist(address);
            address.walletId.should.equal('wallet-id');
            address.address.should.equal('3BY4K8dfsHryhWh2MJ6XHxxsRfcvPAyseH');
            address.networkName.should.equal(LIVENET.name);
            address.isChange.should.be.false;
            address.path.should.equal('m/0/0');
            address.type.should.equal('P2SH');
        });

        it('should derive 1-of-1 P2PKH address', function () {
            const address = new Address().derive('wallet-id', 'P2PKH', [{
                xPubKey: 'xpub686v8eJUJEqxzAtkWPyQ9nvpBHfucVsB8Q8HQHw5mxYPQtBact2rmA8wRXFYaVESK8f7WrxeU4ayALaEhicdXCX5ZHktNeRFnvFeffztiY1'
                // PubKey(xPubKey/1/2) -> 0232c09a6edd8e2189628132d530c038e0b15b414cf3984e532358cbcfb83a7bd7
            }], 'm/1/2', 1, LIVENET.name, true);
            should.exist(address);
            address.walletId.should.equal('wallet-id');
            address.address.should.equal('1G4wgi9YzmSSwQaQVLXQ5HUVquQDgJf8oT');
            address.networkName.should.equal(LIVENET.name);
            address.isChange.should.be.true;
            address.path.should.equal('m/1/2');
            address.type.should.equal('P2PKH');
        });
    });
});
