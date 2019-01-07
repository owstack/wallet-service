'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BaseBlockchainExplorer = BaseWalletService.BlockchainExplorer;

var Explorer = require('./blockchainexplorers/explorer');
var Networks = cLib.Networks;

var context = new Context({
	Explorer: Explorer,
	Networks: Networks
});

class CBlockchainExplorer extends BaseBlockchainExplorer {
	constructor(opts, config) {
		// Returns a different class.
	  super(context, opts, config);		
	}
};

module.exports = CBlockchainExplorer;
