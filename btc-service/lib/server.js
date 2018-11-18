'use strict';

var baseService = require('../../base-service');
var baseWalletService = baseService.WalletService;

var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var Common = require('./common');
var config = require('../config');
var Defaults = Common.Defaults;
var FiatRateService = require('./fiatrateservice');
var Networks = btcLib.Networks;
var Server = baseWalletService.Server;
var Transaction = btcLib.Transaction;
var Units = btcLib.Units;
var inherits = require('inherits');

function BtcServer(callerConfig, cb) {
  if (!(this instanceof BtcServer)){
    return new BtcServer(callerConfig, cb);
  }
  var config = callerConfig || config;

console.log('BtcServer ctor '+JSON.stringify(config));
	var context = {
		Address: Address,
		Defaults: Defaults,
		FiatRateService: FiatRateService,
		Networks: Networks,
		Transaction: Transaction
	};

  return Server.apply(this, [context, config, cb]);
};
inherits(BtcServer, Server);

// Expose all static methods.
Object.keys(Server).forEach(function(key) {
  BtcServer[key] = Server[key];
});

/**
 *
 */
BtcServer.getInstance = function(callerConfig, cb) {
  var config = callerConfig || config;
//TODO remove?  new BtcServer(config, function(server) {
  BtcServer(config, function(server) {
	  server._setClientVersion(config.clientVersion);
	  cb(server);
  });
};

/**
 *
 */
BtcServer.getInstanceWithAuth = function(auth, cb) {
	if (auth.session) {
		if (!Server.checkRequired(auth, ['copayerId', 'session'], cb)) {
	    return;
	  }
	} else {
	  if (!Server.checkRequired(auth, ['copayerId', 'message', 'signature'], cb)) {
	    return;
	  }
	}

  try {
//    BtcServer.getInstance(config, function(server) {
    BtcServer.getInstance({}, function(server) {
		  server.initInstanceWithAuth(auth, cb);
    });
  } catch (ex) {
    return cb(ex);
  }

};

module.exports = BtcServer;
