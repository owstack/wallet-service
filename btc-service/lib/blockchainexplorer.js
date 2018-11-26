'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var BlockchainExplorer = BaseWalletService.BlockchainExplorer;
var btcLib = require('@owstack/btc-lib');
var Explorer = require('./blockchainexplorers/explorer');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcBlockchainExplorer(opts, config) {
	var context = {
		Explorer: Explorer,
		Networks: Networks
	};

  return BlockchainExplorer.apply(this, [context, opts, config]);
};
inherits(BtcBlockchainExplorer, BlockchainExplorer);

// Expose all static methods.
Object.keys(BlockchainExplorer).forEach(function(key) {
  BtcBlockchainExplorer[key] = BlockchainExplorer[key];
});

module.exports = BtcBlockchainExplorer;
