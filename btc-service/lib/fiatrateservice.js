'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var FiatRateService = BaseWalletService.FiatRateService;
var Storage = require('./storage');
var inherits = require('inherits');

var context = {
	Storage: Storage
};

function CFiatRateService(config) {
  return FiatRateService.apply(this, [context, config]);
};
inherits(CFiatRateService, FiatRateService);

// Expose all static methods.
Object.keys(FiatRateService).forEach(function(key) {
  CFiatRateService[key] = FiatRateService[key];
});

module.exports = CFiatRateService;
