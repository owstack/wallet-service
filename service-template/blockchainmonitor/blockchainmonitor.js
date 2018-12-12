#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BaseBlockchainMonitor = baseService.BlockchainMonitor;

var BlockchainMonitor = require('../lib/blockchainmonitor');

var context = {
	BlockchainMonitor: BlockchainMonitor
};

class CBlockchainMonitor extends BaseBlockchainMonitor {
	constructor(config) {
	  super(context, config);
	}
};

// Start the service with base configuration (default).
var service = new CBlockchainMonitor();
service.start();
