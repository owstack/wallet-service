const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseNode = require('../../base-service').Node;
const BlockchainMonitor = require('../lib/blockchainmonitor');
const EmailService = require('../lib/emailservice');
const Networks = cLib.Networks;

const context = new Context({
    BlockchainMonitor: BlockchainMonitor,
    EmailService: EmailService,
    Networks: Networks
});

class CNode extends BaseNode {
    constructor(config, opts) {
        super(context, config, opts);
    }
}

module.exports = CNode;
