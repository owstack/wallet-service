'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var FiatRateService = BaseWalletService.FiatRateService;
var Storage = require('./storage');
var inherits = require('inherits');

function BtcFiatRateService(config) {
	var context = {
		Storage: Storage
	};

  return FiatRateService.apply(this, [context, config]);
};
inherits(BtcFiatRateService, FiatRateService);

// Expose all static methods.
Object.keys(FiatRateService).forEach(function(key) {
  BtcFiatRateService[key] = FiatRateService[key];
});

module.exports = BtcFiatRateService;
