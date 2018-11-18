#!/usr/bin/env node

'use strict';

var log = require('npmlog');

log.debug = log.verbose;

var Service = function(context) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

	this.blockchainmonitor = new this.ctx.BlockchainMonitor();
};

Service.prototype.start = function() {
	this.bblockchainmonitor.start(this.ctx.config, function(err) {
	  if (err) {
	  	throw err;
	  }

	  console.log('Blockchain monitor started');
	});
}

module.exports = Service;
