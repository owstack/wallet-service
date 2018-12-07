'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseStorage = BaseWalletService.Storage;

var Address = require('./model/address');
var Session = require('./model/session');
var TxProposal = require('./model/txproposal');
var Wallet = require('./model/wallet');
var inherits = require('inherits');

var context = {
	Address: Address,
	Session: Session,
	TxProposal: TxProposal,
	Wallet: Wallet
};

function CStorage(config) {
  return BaseStorage.apply(this, [context, config]);
};
inherits(CStorage, BaseStorage);

// Expose all static methods.
Object.keys(BaseStorage).forEach(function(key) {
  CStorage[key] = BaseStorage[key];
});

module.exports = CStorage;
