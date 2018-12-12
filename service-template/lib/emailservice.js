'use strict';

var cLib = require('../cLib');

var BaseWalletService = require('../../base-service').WalletService;
var BaseEmailService = BaseWalletService.EmailService;

var Common = require('./common');
var Networks = cLib.Networks;
var Storage = require('./storage');
var Utils = Common.Utils;

var context = {
	Networks: Networks,
	Storage: Storage,
	Utils: Utils
};

class CEmailService extends BaseEmailService {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CEmailService;
