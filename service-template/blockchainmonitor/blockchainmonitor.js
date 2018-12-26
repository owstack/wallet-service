#!/usr/bin/env node

'use strict';

var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseBlockchainMonitor = require('../../base-service').BlockchainMonitor;
var BlockchainMonitor = require('../lib/blockchainmonitor');

var context = new Context({
	BlockchainMonitor: BlockchainMonitor
});

class CBlockchainMonitor extends BaseBlockchainMonitor {
	constructor(config) {
	  super(context, config);
	}
};

// Start the service with base configuration (default).
var service = new CBlockchainMonitor();
service.start();
