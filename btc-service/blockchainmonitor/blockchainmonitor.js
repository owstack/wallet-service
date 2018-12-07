#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BaseBlockchainMonitor = baseService.BlockchainMonitor;

var BlockchainMonitor = require('../lib/blockchainmonitor');
var inherits = require('inherits');

var context = {
	BlockchainMonitor: BlockchainMonitor
};

function CBlockchainMonitor(config) {
  BaseBlockchainMonitor.apply(this, [context, config]);
};
inherits(CBlockchainMonitor, BaseBlockchainMonitor);

// Expose all static methods.
Object.keys(BaseBlockchainMonitor).forEach(function(key) {
  CBlockchainMonitor[key] = BaseBlockchainMonitor[key];
});

// Start the service with base configuration (default).
var service = new CBlockchainMonitor();
service.start();
