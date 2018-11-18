'use strict';

var baseService = require('../../base-service');
var BaseFiatRateService = baseService.FiatRateService;

var config = require('../config');
var FiatRateService = require('../lib/fiatrateservice');
var inherits = require('inherits');

function BtcFiatRateService() {
	var context = {
		config: config,
		FiatRateService: FiatRateService
	};

  BaseFiatRateService.apply(this, [context]);
};
inherits(BtcFiatRateService, BaseFiatRateService);

// Expose all static methods.
Object.keys(BaseFiatRateService).forEach(function(key) {
  BtcFiatRateService[key] = BaseFiatRateService[key];
});

module.exports = BtcFiatRateService;
