'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var EmailService = BaseWalletService.EmailService;
var btcLib = require('@owstack/btc-lib');
var Common = require('./common');
var Networks = btcLib.Networks;
var Storage = require('./storage');
var Utils = Common.Utils;
var inherits = require('inherits');

var context = {
	Networks: Networks,
	Storage: Storage,
	Utils: Utils
};

function CEmailService(config) {
  return EmailService.apply(this, [context, config]);
};
inherits(CEmailService, EmailService);

// Expose all static methods.
Object.keys(EmailService).forEach(function(key) {
  CEmailService[key] = EmailService[key];
});

module.exports = CEmailService;
