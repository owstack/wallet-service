'use strict';

var cLib = require('../cLib');

var BaseWalletService = require('../../base-service').WalletService;
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
