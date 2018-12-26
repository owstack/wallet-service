'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BaseBlockchainMonitor = BaseWalletService.BlockchainMonitor;

var BlockchainExplorer = require('./blockchainexplorer');
var Networks = cLib.Networks;
var Unit = cLib.Unit;

var context = new Context({
	BlockchainExplorer: BlockchainExplorer,
	Networks: Networks,
	Unit: Unit
});

class CBlockchainMonitor extends BaseBlockchainMonitor {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CBlockchainMonitor;
