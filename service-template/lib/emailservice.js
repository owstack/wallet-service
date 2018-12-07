'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseEmailService = BaseWalletService.EmailService;

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

function CEmailService(config) {
  BaseEmailService.apply(this, [context, config]);
};
inherits(CEmailService, BaseEmailService);

// Expose all static methods.
Object.keys(BaseEmailService).forEach(function(key) {
  CEmailService[key] = BaseEmailService[key];
});

module.exports = CEmailService;
