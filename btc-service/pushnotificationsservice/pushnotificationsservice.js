#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BasePushNotificationsService = baseService.PushNotificationsService;

var PushNotificationsService = require('../lib/pushnotificationsservice');
var inherits = require('inherits');

var context = {
	PushNotificationsService: PushNotificationsService
};

function BtcPushNotificationsService(config) {
  return BasePushNotificationsService.apply(this, [context, config]);
};
inherits(BtcPushNotificationsService, BasePushNotificationsService);

// Expose all static methods.
Object.keys(BasePushNotificationsService).forEach(function(key) {
  BtcPushNotificationsService[key] = BasePushNotificationsService[key];
});

// Start the service with base configuration (default).
var service = new BtcPushNotificationsService();
service.start();
