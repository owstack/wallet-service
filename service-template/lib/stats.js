const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BaseStats = BaseWalletService.Stats;

const Networks = cLib.Networks;

const context = new Context({
    Networks: Networks
});

class CStats extends BaseStats {
    constructor(config) {
        super(context, config);
    }
}

module.exports = CStats;
