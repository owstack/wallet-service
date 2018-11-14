'use strict';

var baseService = require('../base-service');
var FiatRateService = baseService.FiatRateService;
var btcLib = require('@owstack/btc-lib');
var Defaults = btcLib.Defaults;
var inherits = require('inherits');

function BtcFiatRateService(opts) {
	var context = {
		Defaults: Defaults
	};

  FiatRateService.apply(this, [context, opts]);
};
inherits(BtcFiatRateService, FiatRateService);

// Expose all static methods.
Object.keys(FiatRateService).forEach(function(key) {
  BtcFiatRateService[key] = FiatRateService[key];
});

module.exports = BtcFiatRateService;
