'use strict';

var baseService = require('../../base-service');
var BaseNode = baseService.Node;

var config = require('../config');
var BlockchainMonitor = require('../lib/blockchainmonitor');
var ExpressApp = require('../lib/expressapp');
var inherits = require('inherits');

function BtcNode(opts) {
	var context = {
		config: config,
		BlockchainMonitor: BlockchainMonitor,
		ExpressApp: ExpressApp
	};

  return BaseNode.apply(this, [context, opts]);
};
inherits(BtcNode, BaseNode);

// Expose all static methods.
Object.keys(BaseNode).forEach(function(key) {
  BtcNode[key] = BaseNode[key];
});

module.exports = BtcNode;
