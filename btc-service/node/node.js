'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseNode = baseService.Node;

var BlockchainMonitor = require('../lib/blockchainmonitor');
var EmailService = require('../lib/emailservice');
var Networks = cLib.Networks;
var inherits = require('inherits');

var context = {
	BlockchainMonitor: BlockchainMonitor,
	EmailService: EmailService,
	Networks: Networks
};

function CNode(config, opts) {
  BaseNode.apply(this, [context, config, opts]);
};
inherits(CNode, BaseNode);

// Expose all static methods.
Object.keys(BaseNode).forEach(function(key) {
  CNode[key] = BaseNode[key];
});

module.exports = CNode;
