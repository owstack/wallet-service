'use strict';

var baseService = require('../../base-service');
var baseWalletService = baseService.WalletService;

var BlockchainExplorer = baseWalletService.BlockchainExplorer;
var btcLib = require('@owstack/btc-lib');
var config = require('../config');
var Explorer = require('./blockchainexplorers/explorer');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcBlockchainExplorer(opts) {
	var context = {
		config: config,
		Explorer: Explorer,
		Networks: Networks
	};

  return BlockchainExplorer.apply(this, [context, opts]);
};
inherits(BtcBlockchainExplorer, BlockchainExplorer);

// Expose all static methods.
Object.keys(BlockchainExplorer).forEach(function(key) {
  BtcBlockchainExplorer[key] = BlockchainExplorer[key];
});

module.exports = BtcBlockchainExplorer;
