'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BasePushNotificationsService = BaseWalletService.PushNotificationsService;

var Common = require('./common');
var Networks = cLib.Networks;
var Storage = require('./storage');
var Unit = cLib.Unit;
var Utils = Common.Utils;

var context = new Context({
	Networks: Networks,
	Storage: Storage,
	Unit: Unit,
	Utils: Utils
});

class CPushNotificationsService extends BasePushNotificationsService {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CPushNotificationsService;
