

const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BaseBlockchainMonitor = BaseWalletService.BlockchainMonitor;

const BlockchainExplorer = require('./blockchainexplorer');
const Networks = cLib.Networks;
const Unit = cLib.Unit;

const context = new Context({
    BlockchainExplorer: BlockchainExplorer,
    Networks: Networks,
    Unit: Unit
});

class CBlockchainMonitor extends BaseBlockchainMonitor {
    constructor(config) {
        super(context, config);
    }
}

module.exports = CBlockchainMonitor;
