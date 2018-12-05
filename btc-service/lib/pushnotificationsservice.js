'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var PushNotificationsService = BaseWalletService.PushNotificationsService;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var Storage = require('./storage');
var inherits = require('inherits');

function BtcPushNotificationsService(config) {
	var context = {
		Networks: Networks,
		Storage: Storage
	};

  return PushNotificationsService.apply(this, [context, config]);
};
inherits(BtcPushNotificationsService, PushNotificationsService);

// Expose all static methods.
Object.keys(PushNotificationsService).forEach(function(key) {
  BtcPushNotificationsService[key] = PushNotificationsService[key];
});

module.exports = BtcPushNotificationsService;
