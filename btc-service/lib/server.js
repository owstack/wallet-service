'use strict';

var cLib = require('@owstack/btc-lib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseServer = BaseWalletService.Server;

var owsCommon = require('@owstack/ows-common');
var Common = require('./common');
var Model = require('./model');
var Address = cLib.Address;
var BlockchainExplorer = require('./blockchainexplorer');
var Copayer = Model.Copayer;
var Defaults = Common.Defaults;
var FiatRateService = require('./fiatrateservice');
var Networks = cLib.Networks;
var Session = Model.Session;
var Storage = require('./storage');
var Transaction = cLib.Transaction;
var TxProposal = Model.TxProposal;
var Unit = cLib.Unit;
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
	
  return BaseServer.apply(this, [context, opts, config, cb]);
};
inherits(CServer, BaseServer);

// Expose all static methods.
Object.keys(BaseServer).forEach(function(key) {
  CServer[key] = BaseServer[key];
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
