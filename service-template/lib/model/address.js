

const cLib = require('../../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseAddress = BaseWalletService.Model.Address;

const Address = cLib.Address;
const Networks = cLib.Networks;

const context = new Context({
    Address: Address,
    Networks: Networks
});

class CAddress extends BaseAddress {
    constructor() {
	  super(context);
    }
}

/**
 *
 */
CAddress.create = function (opts) {
    return BaseAddress.create(context, opts);
};

/**
 *
 */
CAddress.fromObj = function (obj) {
    return BaseAddress.fromObj(context, obj);
};

module.exports = CAddress;
