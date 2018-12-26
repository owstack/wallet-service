'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BaseServer = BaseWalletService.Server;

var Common = require('./common');
var Model = require('./model');
var Address = cLib.Address;
var BlockchainExplorer = require('./blockchainexplorer');
var Copayer = Model.Copayer;
var Defaults = Common.Defaults;
var Networks = cLib.Networks;
var Session = Model.Session;
var Storage = require('./storage');
var Transaction = cLib.Transaction;
var TxProposal = Model.TxProposal;
var Unit = cLib.Unit;
var Utils = Common.Utils;
var Wallet = Model.Wallet;

var context = new Context({
	Address: Address,
	BlockchainExplorer: BlockchainExplorer,
	Copayer: Copayer,
	Defaults: Defaults,
	Networks: Networks,
	Session: Session,
	Storage: Storage,
	Transaction: Transaction,
	TxProposal: TxProposal,
	Unit: Unit,
	Utils: Utils,
	Wallet: Wallet
});

class CServer extends BaseServer {
	constructor(opts, config, cb) {
	  super(context, opts, config, cb);
	}
};

/**
 *
 */
CServer.getInstance = function(opts, config, cb) {
  new CServer(opts, config, cb);
};

/**
 *
 */
CServer.getInstanceWithAuth = function(opts, config, auth, cb) {
  try {
    new CServer.getInstance(opts, config, function(server) {
		  server.initInstanceWithAuth(auth, cb);
    });
  } catch (ex) {
    return cb(ex);
  }
};

module.exports = CServer;
