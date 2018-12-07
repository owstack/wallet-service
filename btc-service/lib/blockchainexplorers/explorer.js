'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var Explorer = BaseWalletService.BlockchainExplorers.Explorer;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

var context = {
	Networks: Networks
};

function CExplorer(opts) {
  return Explorer.apply(this, [context, opts]);
};
inherits(CExplorer, Explorer);

// Expose all static methods.
Object.keys(Explorer).forEach(function(key) {
  CExplorer[key] = Explorer[key];
});

module.exports = CExplorer;
