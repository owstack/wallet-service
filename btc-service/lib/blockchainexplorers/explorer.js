'use strict';

var baseService = require('../base-service');
var Explorer = baseService.BlockchainExplorers.explorer;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcExplorer(opts) {
	var context = {
		Networks: Networks
	};

  Explorer.apply(this, [context, opts]);
};
inherits(BtcExplorer, Explorer);

// Expose all static methods.
Object.keys(Explorer).forEach(function(key) {
  BtcExplorer[key] = Explorer[key];
});

module.exports = BtcExplorer;
