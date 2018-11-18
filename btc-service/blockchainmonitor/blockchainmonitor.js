'use strict';

var baseService = require('../../base-service');
var BaseBlockchainMonitor = baseService.BlockchainMonitor;

var BlockchainMonitor = require('../lib/blockchainmonitor');
var config = require('../config');
var inherits = require('inherits');

function BtcBlockchainMonitor(opts) {
	var context = {
		BlockchainMonitor: BlockchainMonitor,
		config: config
	};

  BaseBlockchainMonitor.apply(this, [context, opts]);
};
inherits(BtcBlockchainMonitor, BaseBlockchainMonitor);

// Expose all static methods.
Object.keys(BaseBlockchainMonitor).forEach(function(key) {
  BtcBlockchainMonitor[key] = BaseBlockchainMonitor[key];
});

module.exports = BtcBlockchainMonitor;
