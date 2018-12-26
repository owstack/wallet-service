#!/usr/bin/env node

'use strict';

var baseConfig = require('../../config');
var log = require('npmlog');

log.debug = log.verbose;

class Service {
	constructor(context, config) {
	  // Context defines the coin network and is set by the implementing service in
	  // order to instance this base service; e.g., btc-service.
    context.inject(this);

	  this.config = config || baseConfig;
		this.blockchainmonitor = new this.ctx.BlockchainMonitor(this.config);
	}
};

Service.prototype.start = function() {
	this.blockchainmonitor.start(null, function(err) {
	  if (err) {
	  	throw err;
	  }

	  console.log('Blockchain monitor started');
	});
}

if (require.main === module) {
	throw 'The base blockchain monitor cannot be started from the command line';
}

module.exports = Service;
