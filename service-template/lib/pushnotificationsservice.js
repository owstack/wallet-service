'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BasePushNotificationsService = BaseWalletService.PushNotificationsService;

var Common = require('./common');
var Networks = cLib.Networks;
var Storage = require('./storage');
var Utils = Common.Utils;
var inherits = require('inherits');

var context = {
	Networks: Networks,
	Storage: Storage,
	Utils: Utils
};

function CPushNotificationsService(config) {
  BasePushNotificationsService.apply(this, [context, config]);
};
inherits(CPushNotificationsService, BasePushNotificationsService);

// Expose all static methods.
Object.keys(BasePushNotificationsService).forEach(function(key) {
  CPushNotificationsService[key] = BasePushNotificationsService[key];
});

module.exports = CPushNotificationsService;
