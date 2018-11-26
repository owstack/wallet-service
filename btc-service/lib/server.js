'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var owsCommon = require('@owstack/ows-common');
var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var BlockchainExplorer = require('./blockchainexplorer');
var Common = require('./common');
var Defaults = Common.Defaults;
var Networks = btcLib.Networks;
var Server = BaseWalletService.Server;
var Transaction = btcLib.Transaction;
var TxProposal = require('./model/txproposal');
var Units = btcLib.Units;
var Wallet = require('./model/wallet');
var inherits = require('inherits');
var lodash = owsCommon.deps.lodash;

function BtcServer(config, cb) {
  if (!(this instanceof BtcServer)){
    return new BtcServer(config, cb);
  }
	
	var context = {
		Address: Address,
		BlockchainExplorer: BlockchainExplorer,
		Defaults: Defaults,
		Networks: Networks,
		Transaction: Transaction,
		TxProposal: TxProposal,
		Wallet: Wallet
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
BtcServer.getInstance = function(config, cb) {
  BtcServer(config, cb);
};

/**
 *
 */
BtcServer.getInstanceWithAuth = function(config, auth, cb) {
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
    BtcServer.getInstance(config, function(server) {
		  server.initInstanceWithAuth(auth, cb);
    });
  } catch (ex) {
    return cb(ex);
  }

};

module.exports = BtcServer;
