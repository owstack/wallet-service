#!/usr/bin/env node

'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseEmailService = require('../../base-service').EmailService;
var EmailService = require('../lib/emailservice');
var Networks = cLib.Networks;

var context = new Context({
	EmailService: EmailService,
	Networks: Networks
});

class CEmailService extends BaseEmailService {
	constructor(config) {
	  super(context, config);
	}
};

// Start the service with base configuration (default).
var service = new CEmailService();
service.start();
