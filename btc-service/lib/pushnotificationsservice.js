'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var PushNotificationsService = BaseWalletService.PushNotificationsService;
var btcLib = require('@owstack/btc-lib');
var Common = require('./common');
var Networks = btcLib.Networks;
var Storage = require('./storage');
var Utils = Common.Utils;
var inherits = require('inherits');

function BtcPushNotificationsService(config) {
	var context = {
		Networks: Networks,
		Storage: Storage,
		Utils: Utils
	};

  return PushNotificationsService.apply(this, [context, config]);
};
inherits(BtcPushNotificationsService, PushNotificationsService);

// Expose all static methods.
Object.keys(PushNotificationsService).forEach(function(key) {
  BtcPushNotificationsService[key] = PushNotificationsService[key];
});

module.exports = BtcPushNotificationsService;
