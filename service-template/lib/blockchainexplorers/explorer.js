

const cLib = require('../../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseExplorer = BaseWalletService.BlockchainExplorers.Explorer;

const Networks = cLib.Networks;

const context = new Context({
    Networks: Networks
});

class CExplorer extends BaseExplorer {
    constructor(opts) {
	  super(context, opts);
    }
}

module.exports = CExplorer;
