

const cLib = require('../../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseWallet = BaseWalletService.Model.Wallet;

const Address = require('./address');
const Copayer = require('./copayer');

const context = new Context({
    Address: Address,
    Copayer: Copayer
});

class CWallet extends BaseWallet {
    constructor(obj) {
	  super(context, obj);
    }
}

/**
 *
 */
CWallet.create = function (obj) {
    return BaseWallet.create(context, obj);
};

/**
 *
 */
CWallet.fromObj = function (obj) {
    return BaseWallet.fromObj(context, obj);
};

module.exports = CWallet;
