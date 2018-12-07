'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var BlockchainExplorer = require('./blockchainexplorer');
var BlockchainMonitor = BaseWalletService.BlockchainMonitor;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var Unit = btcLib.Unit;
var inherits = require('inherits');

var context = {
	BlockchainExplorer: BlockchainExplorer,
	Networks: Networks,
	Unit: Unit
};

function CBlockchainMonitor(config) {
  return BlockchainMonitor.apply(this, [context, config]);
};
inherits(CBlockchainMonitor, BlockchainMonitor);

// Expose all static methods.
Object.keys(BlockchainMonitor).forEach(function(key) {
  CBlockchainMonitor[key] = BlockchainMonitor[key];
});

module.exports = CBlockchainMonitor;
