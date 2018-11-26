'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var PushNotificationsService = BaseWalletService.PushNotificationsService;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcPushNotificationsService() {
	var context = {
		Networks: Networks
	};

  return PushNotificationsService.apply(this, [context]);
};
inherits(BtcPushNotificationsService, PushNotificationsService);

// Expose all static methods.
Object.keys(PushNotificationsService).forEach(function(key) {
  BtcPushNotificationsService[key] = PushNotificationsService[key];
});

module.exports = BtcPushNotificationsService;
