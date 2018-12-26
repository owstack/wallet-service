'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BaseEmailService = BaseWalletService.EmailService;

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

class CEmailService extends BaseEmailService {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CEmailService;
