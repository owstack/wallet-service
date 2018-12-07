#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BasePushNotificationsService = baseService.PushNotificationsService;

var PushNotificationsService = require('../lib/pushnotificationsservice');
var inherits = require('inherits');

var context = {
	PushNotificationsService: PushNotificationsService
};

function CPushNotificationsService(config) {
  BasePushNotificationsService.apply(this, [context, config]);
};
inherits(CPushNotificationsService, BasePushNotificationsService);

// Expose all static methods.
Object.keys(BasePushNotificationsService).forEach(function(key) {
  CPushNotificationsService[key] = BasePushNotificationsService[key];
});

// Start the service with base configuration (default) and no options.
var service = new CPushNotificationsService();
service.start();
