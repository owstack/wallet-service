'use strict';

var baseService = require('../base-service');
var ExpressApp = baseService.ExpressApp;
var btcLib = require('@owstack/btc-lib');
var Defaults = btcLib.Defaults;
var inherits = require('inherits');

function BtcExpressApp(opts) {
	var context = {
		Defaults: Defaults
	};

  ExpressApp.apply(this, [context, opts]);
};
inherits(BtcExpressApp, ExpressApp);

// Expose all static methods.
Object.keys(ExpressApp).forEach(function(key) {
  BtcExpressApp[key] = ExpressApp[key];
});

module.exports = BtcExpressApp;
