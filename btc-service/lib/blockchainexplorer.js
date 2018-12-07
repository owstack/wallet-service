'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var BlockchainExplorer = BaseWalletService.BlockchainExplorer;
var btcLib = require('@owstack/btc-lib');
var Explorer = require('./blockchainexplorers/explorer');
var Networks = btcLib.Networks;
var inherits = require('inherits');

var context = {
	Explorer: Explorer,
	Networks: Networks
};

function CBlockchainExplorer(opts, config) {
  return BlockchainExplorer.apply(this, [context, opts, config]);
};
inherits(CBlockchainExplorer, BlockchainExplorer);

// Expose all static methods.
Object.keys(BlockchainExplorer).forEach(function(key) {
  CBlockchainExplorer[key] = BlockchainExplorer[key];
});

module.exports = CBlockchainExplorer;
