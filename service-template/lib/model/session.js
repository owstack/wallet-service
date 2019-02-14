

const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseSession = BaseWalletService.Model.Session;

const Defaults = require('../common/defaults');

const context = new Context({
    Defaults: Defaults
});

class CSession extends BaseSession {
    constructor(opts) {
	  super(context, opts);
    }
}

/**
 *
 */
CSession.fromObj = function (obj) {
    return BaseSession.fromObj(context, obj);
};

module.exports = CSession;
