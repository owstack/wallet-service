'use strict';

var baseService = require('../../base-service');
var baseWalletService = baseService.WalletService;

var Common = require('./common');
var Defaults = Common.Defaults;
var Stats = baseWalletService.Stats;
var inherits = require('inherits');

function BtcStats(opts) {
	var context = {
		Defaults: Defaults
	};

  return Stats.apply(this, [context, opts]);
};
inherits(BtcStats, Stats);

// Expose all static methods.
Object.keys(Stats).forEach(function(key) {
  BtcStats[key] = Stats[key];
});

module.exports = BtcStats;
