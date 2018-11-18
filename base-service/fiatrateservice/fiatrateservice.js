#!/usr/bin/env node

'use strict';

var log = require('npmlog');

log.debug = log.verbose;

var Service = function(context) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

	this.fiatRateService = new this.ctx.FiatRateService();
};

Service.prototype.start = function() {
	this.fiatRateService.init(this.ctx.config, function(err) {
	  if (err) {
	  	throw err;
	  }
	  this.fiatRateService.startCron(this.ctx.config, function(err) {
	    if (err) {
	    	throw err;
	    }

	    console.log('Fiat rate service started');
	  });
	});
}

module.exports = Service;
