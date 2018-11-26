'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var Explorer = BaseWalletService.BlockchainExplorers.Explorer;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcExplorer(opts) {
	var context = {
		Networks: Networks
	};

  return Explorer.apply(this, [context, opts]);
};
inherits(BtcExplorer, Explorer);

// Expose all static methods.
Object.keys(Explorer).forEach(function(key) {
  BtcExplorer[key] = Explorer[key];
});

module.exports = BtcExplorer;
