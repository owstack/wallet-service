'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var EmailService = BaseWalletService.EmailService;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcEmailService(config) {
	var context = {
		Networks: Networks
	};

  return EmailService.apply(this, [context, config]);
};
inherits(BtcEmailService, EmailService);

// Expose all static methods.
Object.keys(EmailService).forEach(function(key) {
  BtcEmailService[key] = EmailService[key];
});

module.exports = BtcEmailService;
