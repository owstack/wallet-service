'use strict';

var baseService = require('../base-service');
var btcLib = require('@owstack/btc-lib');
var Defaults = btcLib.Defaults;
var Stats = baseService.Stats;
var inherits = require('inherits');

function BtcStats(opts) {
	var context = {
		Defaults: Defaults
	};

  Stats.apply(this, [context, opts]);
};
inherits(BtcStats, Stats);

// Expose all static methods.
Object.keys(Stats).forEach(function(key) {
  BtcStats[key] = Stats[key];
});

module.exports = BtcStats;
