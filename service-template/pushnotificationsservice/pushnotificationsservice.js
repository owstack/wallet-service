#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BasePushNotificationsService = baseService.PushNotificationsService;

var PushNotificationsService = require('../lib/pushnotificationsservice');

var context = {
	PushNotificationsService: PushNotificationsService
};

class CPushNotificationsService extends BasePushNotificationsService {
	constructor(config) {
	  super(context, config);
	}
};

// Start the service with base configuration (default) and no options.
var service = new CPushNotificationsService();
service.start();
