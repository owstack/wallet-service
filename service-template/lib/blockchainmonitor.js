'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseBlockchainMonitor = BaseWalletService.BlockchainMonitor;

var BlockchainExplorer = require('./blockchainexplorer');
var Networks = cLib.Networks;
var Unit = cLib.Unit;
var inherits = require('inherits');

var context = {
	BlockchainExplorer: BlockchainExplorer,
	Networks: Networks,
	Unit: Unit
};

function CBlockchainMonitor(config) {
  BaseBlockchainMonitor.apply(this, [context, config]);
};
inherits(CBlockchainMonitor, BaseBlockchainMonitor);

// Expose all static methods.
Object.keys(BaseBlockchainMonitor).forEach(function(key) {
  CBlockchainMonitor[key] = BaseBlockchainMonitor[key];
});

module.exports = CBlockchainMonitor;
