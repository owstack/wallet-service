'use strict';

var baseService = require('../../../base-service');
var BlockchainExplorers = baseService.WalletService.BlockchainExplorers;

BlockchainExplorers.Explorer = require('./explorer');

module.exports = BlockchainExplorers;
