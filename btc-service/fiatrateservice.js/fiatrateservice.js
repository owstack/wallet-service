#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BaseFiatRateService = baseService.FiatRateService;

var FiatRateService = require('../lib/fiatrateservice');
var inherits = require('inherits');

function BtcFiatRateService(config) {
	var context = {
		FiatRateService: FiatRateService
	};

  BaseFiatRateService.apply(this, [context, config]);
};
inherits(BtcFiatRateService, BaseFiatRateService);

// Expose all static methods.
Object.keys(BaseFiatRateService).forEach(function(key) {
  BtcFiatRateService[key] = BaseFiatRateService[key];
});

// Start the service with base configuration (default).
var service = new BtcFiatRateService();
service.start();
