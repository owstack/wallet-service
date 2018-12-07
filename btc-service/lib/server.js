'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var owsCommon = require('@owstack/ows-common');
var btcLib = require('@owstack/btc-lib');
var Common = require('./common');
var Model = require('./model');
var Address = btcLib.Address;
var BlockchainExplorer = require('./blockchainexplorer');
var Copayer = Model.Copayer;
var Defaults = Common.Defaults;
var FiatRateService = require('./fiatrateservice');
var Networks = btcLib.Networks;
var Server = BaseWalletService.Server;
var Session = Model.Session;
var Storage = require('./storage');
var Transaction = btcLib.Transaction;
var TxProposal = Model.TxProposal;
var Unit = btcLib.Unit;
var Utils = Common.Utils;
var Wallet = Model.Wallet;
var inherits = require('inherits');
var lodash = owsCommon.deps.lodash;

var context = {
	Address: Address,
	BlockchainExplorer: BlockchainExplorer,
	Copayer: Copayer,
	Defaults: Defaults,
	FiatRateService: FiatRateService,
	Networks: Networks,
	Session: Session,
	Storage: Storage,
	Transaction: Transaction,
	TxProposal: TxProposal,
	Unit: Unit,
	Utils: Utils,
	Wallet: Wallet
};

function CServer(opts, config, cb) {
  if (!(this instanceof CServer)) {
    return new CServer(opts, config, cb);
  }
	
  return Server.apply(this, [context, opts, config, cb]);
};
inherits(CServer, Server);

// Expose all static methods.
Object.keys(Server).forEach(function(key) {
  CServer[key] = Server[key];
});

/**
 *
 */
CServer.getInstance = function(opts, config, cb) {
  CServer(opts, config, cb);
};

/**
 *
 */
CServer.getInstanceWithAuth = function(opts, config, auth, cb) {
  try {
    CServer.getInstance(opts, config, function(server) {
		  server.initInstanceWithAuth(auth, cb);
    });
  } catch (ex) {
    return cb(ex);
  }

};

module.exports = CServer;
