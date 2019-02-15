

const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BaseBlockchainExplorer = BaseWalletService.BlockchainExplorer;

const Explorer = require('./blockchainexplorers/explorer');
const Networks = cLib.Networks;

const context = new Context({
    Explorer: Explorer,
    Networks: Networks
});

class CBlockchainExplorer extends BaseBlockchainExplorer {
    constructor(opts, config) {
        // Returns a different class.
        super(context, opts, config);
    }
}

module.exports = CBlockchainExplorer;
