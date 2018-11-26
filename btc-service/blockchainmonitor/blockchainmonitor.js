#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BaseBlockchainMonitor = baseService.BlockchainMonitor;

var BlockchainMonitor = require('../lib/blockchainmonitor');
var inherits = require('inherits');

function BtcBlockchainMonitor(config) {
	var context = {
		BlockchainMonitor: BlockchainMonitor
	};

  BaseBlockchainMonitor.apply(this, [context, config]);
};
inherits(BtcBlockchainMonitor, BaseBlockchainMonitor);

// Expose all static methods.
Object.keys(BaseBlockchainMonitor).forEach(function(key) {
  BtcBlockchainMonitor[key] = BaseBlockchainMonitor[key];
});

// Start the service with base configuration (default).
var service = new BtcBlockchainMonitor();
service.start();
