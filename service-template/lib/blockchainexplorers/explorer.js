'use strict';

var cLib = require('../../cLib');

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseExplorer = BaseWalletService.BlockchainExplorers.Explorer;

var Networks = cLib.Networks;

var context = {
	Networks: Networks
};

class CExplorer extends BaseExplorer {
	constructor(opts) {
	  super(context, opts);
	}
};

module.exports = CExplorer;
