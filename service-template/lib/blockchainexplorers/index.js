

const lodash = require('@owstack/ows-common').deps.lodash;
const BlockchainExplorers = lodash.cloneDeep(require('../../../base-service').WalletService.BlockchainExplorers);

BlockchainExplorers.Explorer = require('./explorer');

module.exports = BlockchainExplorers;
