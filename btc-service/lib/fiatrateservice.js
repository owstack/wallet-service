'use strict';

var baseService = require('../../base-service');
var baseWalletService = baseService.WalletService;

var FiatRateService = baseWalletService.FiatRateService;
var Common = require('./common');
var Defaults = Common.Defaults;
var inherits = require('inherits');

function BtcFiatRateService(opts) {
  if (!(this instanceof BtcFiatRateService)){
    return new BtcFiatRateService(opts);
  }

	var context = {
		Defaults: Defaults
	};

  return FiatRateService.apply(this, [context, opts]);
};
inherits(BtcFiatRateService, FiatRateService);

// Expose all static methods.
Object.keys(FiatRateService).forEach(function(key) {
  BtcFiatRateService[key] = FiatRateService[key];
});

module.exports = BtcFiatRateService;
