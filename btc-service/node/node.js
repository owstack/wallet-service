'use strict';

var baseService = require('../../base-service');
var BaseNode = baseService.Node;

var BlockchainMonitor = require('../lib/blockchainmonitor');
var btcLib = require('@owstack/btc-lib');
var EmailService = require('../lib/emailservice');
var Networks = btcLib.Networks;
var inherits = require('inherits');

var context = {
	BlockchainMonitor: BlockchainMonitor,
	EmailService: EmailService,
	Networks: Networks
};

function BtcNode(config, opts) {
  BaseNode.apply(this, [context, config, opts]);
};
inherits(BtcNode, BaseNode);

// Expose all static methods.
Object.keys(BaseNode).forEach(function(key) {
  BtcNode[key] = BaseNode[key];
});

module.exports = BtcNode;
