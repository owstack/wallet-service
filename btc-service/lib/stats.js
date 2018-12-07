'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var Stats = BaseWalletService.Stats;
var inherits = require('inherits');

var context = {
	Networks: Networks
};

function CStats(config) {
  return Stats.apply(this, [context, config]);
};
inherits(CStats, Stats);

// Expose all static methods.
Object.keys(Stats).forEach(function(key) {
  CStats[key] = Stats[key];
});

module.exports = CStats;
