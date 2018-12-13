'use strict';

var lodash = require('@owstack/ows-common').deps.lodash;
var BlockchainExplorers = lodash.cloneDeep(require('../../../base-service').WalletService.BlockchainExplorers);

BlockchainExplorers.Explorer = require('./explorer');

module.exports = BlockchainExplorers;
