'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseFiatRateService = BaseWalletService.FiatRateService;

var Storage = require('./storage');
var inherits = require('inherits');

var context = {
	Storage: Storage
};

function CFiatRateService(config) {
  BaseFiatRateService.apply(this, [context, config]);
};
inherits(CFiatRateService, BaseFiatRateService);

// Expose all static methods.
Object.keys(BaseFiatRateService).forEach(function(key) {
  CFiatRateService[key] = BaseFiatRateService[key];
});

module.exports = CFiatRateService;
