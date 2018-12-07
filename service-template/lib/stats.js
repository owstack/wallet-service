'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseStats = BaseWalletService.Stats;

var Networks = cLib.Networks;
var inherits = require('inherits');

var context = {
	Networks: Networks
};

function CStats(config) {
  return BaseStats.apply(this, [context, config]);
};
inherits(CStats, BaseStats);

// Expose all static methods.
Object.keys(BaseStats).forEach(function(key) {
  CStats[key] = BaseStats[key];
});

module.exports = CStats;
