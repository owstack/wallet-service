#!/usr/bin/env node



const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseBlockchainMonitor = require('../../base-service').BlockchainMonitor;
const BlockchainMonitor = require('../lib/blockchainmonitor');

const context = new Context({
    BlockchainMonitor: BlockchainMonitor
});

class CBlockchainMonitor extends BaseBlockchainMonitor {
    constructor(config) {
	  super(context, config);
    }
}

// Start the service with base configuration (default).
const service = new CBlockchainMonitor();
service.start();
