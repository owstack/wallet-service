'use strict';

var cLib = require('../../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../../base-service').WalletService;
var BaseExplorer = BaseWalletService.BlockchainExplorers.Explorer;

var Networks = cLib.Networks;

var context = new Context({
	Networks: Networks
});

class CExplorer extends BaseExplorer {
	constructor(opts) {
	  super(context, opts);
	}
};

module.exports = CExplorer;
