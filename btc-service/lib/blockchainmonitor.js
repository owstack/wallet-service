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

function BtcBlockchainMonitor(config) {
  return BlockchainMonitor.apply(this, [context, config]);
};
inherits(BtcBlockchainMonitor, BlockchainMonitor);

// Expose all static methods.
Object.keys(BlockchainMonitor).forEach(function(key) {
  BtcBlockchainMonitor[key] = BlockchainMonitor[key];
});

module.exports = BtcBlockchainMonitor;
