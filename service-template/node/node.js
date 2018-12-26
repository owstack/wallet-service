'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseNode = require('../../base-service').Node;
var BlockchainMonitor = require('../lib/blockchainmonitor');
var EmailService = require('../lib/emailservice');
var Networks = cLib.Networks;

var context = new Context({
	BlockchainMonitor: BlockchainMonitor,
	EmailService: EmailService,
	Networks: Networks
});

class CNode extends BaseNode {
	constructor(config, opts) {
	  super(context, config, opts);
	}
};

module.exports = CNode;
