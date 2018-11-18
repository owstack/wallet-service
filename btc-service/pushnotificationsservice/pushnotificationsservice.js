'use strict';

var baseService = require('../../base-service');
var BasePushNotificationsService = baseService.PushNotificationsService;

var config = require('../config');
var inherits = require('inherits');

function BtcPushNotificationsService(opts) {
	var context = {
		config: config
	};

  return BasePushNotificationsService.apply(this, [context, opts]);
};
inherits(BtcPushNotificationsService, BasePushNotificationsService);

// Expose all static methods.
Object.keys(BasePushNotificationsService).forEach(function(key) {
  BtcPushNotificationsService[key] = BasePushNotificationsService[key];
});

module.exports = BtcPushNotificationsService;
