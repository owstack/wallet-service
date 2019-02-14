

const owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseCopayer = BaseWalletService.Model.Copayer;

const Address = require('./address');
var Context = owsCommon.util.Context;

const context = new Context({
    Address: Address
});

class CCopayer extends BaseCopayer {
    constructor() {
	  super(context);
    }
}

/**
 *
 */
CCopayer.create = function (opts) {
    return BaseCopayer.create(context, opts);
};

/**
 *
 */
CCopayer.fromObj = function (obj) {
    return BaseCopayer.fromObj(context, obj);
};

module.exports = CCopayer;
