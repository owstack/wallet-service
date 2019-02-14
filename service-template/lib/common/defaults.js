

const baseService = require('../../../base-service');
const BaseWalletService = baseService.WalletService;

const Defaults = BaseWalletService.Common.Defaults;

Defaults.MIN_FEE_PER_KB = 0;
Defaults.MAX_FEE_PER_KB = 1000000;
Defaults.MIN_TX_FEE = 0;
Defaults.MAX_TX_FEE = 0.1 * 1e8;
Defaults.MAX_TX_SIZE_IN_KB = 100;

Defaults.FEE_LEVELS = [{
    name: 'urgent',
    nbBlocks: 2,
    multiplier: 1.5,
    defaultValue: 150000
}, {
    name: 'priority',
    nbBlocks: 2,
    defaultValue: 100000
}, {
    name: 'normal',
    nbBlocks: 3,
    defaultValue: 80000
}, {
    name: 'economy',
    nbBlocks: 6,
    defaultValue: 50000
}, {
    name: 'superEconomy',
    nbBlocks: 24,
    defaultValue: 20000
}];

Defaults.DEFAULT_FEE_PER_KB = Defaults.FEE_LEVELS[1].defaultValue;

// How many levels to fallback to if the value returned by the network for a given nbBlocks is -1.
Defaults.FEE_LEVELS_FALLBACK = 2;

// The maximum amount of an UTXO to be considered too big to be used in the tx before exploring smaller
// alternatives (proportional to tx amount).
Defaults.UTXO_SELECTION_MAX_SINGLE_UTXO_FACTOR = 2;

// The minimum amount an UTXO need to contribute proportional to tx amount.
Defaults.UTXO_SELECTION_MIN_TX_AMOUNT_VS_UTXO_FACTOR = 0.1;

// The maximum threshold to consider fees non-significant in relation to tx amount.
Defaults.UTXO_SELECTION_MAX_FEE_VS_TX_AMOUNT_FACTOR = 0.05;

// The maximum amount to pay for using small inputs instead of one big input
// when fees are significant (proportional to how much we would pay for using that big input only).
Defaults.UTXO_SELECTION_MAX_FEE_VS_SINGLE_UTXO_FEE_FACTOR = 5;

// Minimum allowed amount for tx outputs (including change) in atomic units.
Defaults.MIN_OUTPUT_AMOUNT = 5000;

// Number of confirmations from which tx in history will be cached (we consider them inmutable).
Defaults.CONFIRMATIONS_TO_START_CACHING = 6 * 6; // ~ 6hrs

module.exports = Defaults;
