'use strict';

var lodash = require('lodash');
var BlockchainExplorers = lodash.cloneDeep(require('../../../base-service').WalletService.BlockchainExplorers);

BlockchainExplorers.Explorer = require('./explorer');

module.exports = BlockchainExplorers;
