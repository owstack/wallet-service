'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseBlockchainMonitor = BaseWalletService.BlockchainMonitor;

var BlockchainExplorer = require('./blockchainexplorer');
var Networks = cLib.Networks;
var Unit = cLib.Unit;

var context = {
	BlockchainExplorer: BlockchainExplorer,
	Networks: Networks,
	Unit: Unit
};

class CBlockchainMonitor extends BaseBlockchainMonitor {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CBlockchainMonitor;
