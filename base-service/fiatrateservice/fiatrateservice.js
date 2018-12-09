#!/usr/bin/env node

'use strict';

var baseConfig = require('../config');
var FiatRateService = require('../lib/fiatrateservice');
var log = require('npmlog');

log.debug = log.verbose;

function Service(config) {
  this.config = config || baseConfig;
	this.fiatRateService = new FiatRateService(this.config);
};

Service.prototype.start = function() {
	this.fiatRateService.start(function(err) {
	  if (err) {
	  	throw err;
	  }

    console.log('Fiat rate service started');
	});
}

// Start the service with base configuration (default).
var service = new Service();
service.start();
