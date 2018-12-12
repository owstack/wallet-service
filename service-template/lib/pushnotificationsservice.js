'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BasePushNotificationsService = BaseWalletService.PushNotificationsService;

var Common = require('./common');
var Networks = cLib.Networks;
var Storage = require('./storage');
var Utils = Common.Utils;

var context = {
	Networks: Networks,
	Storage: Storage,
	Utils: Utils
};

class CPushNotificationsService extends BasePushNotificationsService {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CPushNotificationsService;
