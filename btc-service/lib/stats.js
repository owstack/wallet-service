'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var Stats = BaseWalletService.Stats;
var inherits = require('inherits');

function BtcStats(config) {
	var context = {
		Networks: Networks
	};

  return Stats.apply(this, [context, config]);
};
inherits(BtcStats, Stats);

// Expose all static methods.
Object.keys(Stats).forEach(function(key) {
  BtcStats[key] = Stats[key];
});

module.exports = BtcStats;
