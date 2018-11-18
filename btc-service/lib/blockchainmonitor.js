'use strict';

var baseService = require('../../base-service');
var baseWalletService = baseService.WalletService;

var BlockchainMonitor = baseWalletService.BlockchainMonitor;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcBlockchainMonitor(opts) {
	var context = {
		Networks: Networks
	};

  return BlockchainMonitor.apply(this, [context, opts]);
};
inherits(BtcBlockchainMonitor, BlockchainMonitor);

// Expose all static methods.
Object.keys(BlockchainMonitor).forEach(function(key) {
  BtcBlockchainMonitor[key] = BlockchainMonitor[key];
});

module.exports = BtcBlockchainMonitor;
