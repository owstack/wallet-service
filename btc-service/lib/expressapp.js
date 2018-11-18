'use strict';

var baseService = require('../../base-service');
var baseWalletService = baseService.WalletService;

var ExpressApp = baseWalletService.ExpressApp;
var Common = require('./common');
var Defaults = Common.Defaults;
var Server = require('./server');
var inherits = require('inherits');

function BtcExpressApp(opts) {
	var context = {
		Defaults: Defaults,
		Server: Server
	};

  return ExpressApp.apply(this, [context, opts]);
};
inherits(BtcExpressApp, ExpressApp);

// Expose all static methods.
Object.keys(ExpressApp).forEach(function(key) {
  BtcExpressApp[key] = ExpressApp[key];
});

module.exports = BtcExpressApp;
