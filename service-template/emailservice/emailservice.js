#!/usr/bin/env node



const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseEmailService = require('../../base-service').EmailService;
const EmailService = require('../lib/emailservice');
const Networks = cLib.Networks;

const context = new Context({
    EmailService: EmailService,
    Networks: Networks
});

class CEmailService extends BaseEmailService {
    constructor(config) {
        super(context, config);
    }
}

// Start the service with base configuration (default).
const service = new CEmailService();
service.start();
