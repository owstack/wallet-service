'use strict';

var baseService = require('../base-service');
var BaseServer = baseService.server;
var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var Defaults = btcLib.Defaults;
var Networks = btcLib.Networks;
var Transaction = btcLib.Transaction;
var Units = btcLib.Units;
var inherits = require('inherits');

function BtcServer(opts) {
	var context = {
		Address: Address,
		Defaults: Defaults,
		Networks: Networks,
		Transaction: Transaction
	};

  BaseServer.apply(this, [context, opts]);
};
inherits(BtcServer, BaseServer);

// Expose all static methods.
Object.keys(BaseServer).forEach(function(key) {
  BtcServer[key] = BaseServer[key];
});

module.exports = BtcServer;
