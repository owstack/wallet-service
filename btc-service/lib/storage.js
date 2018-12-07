'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;

var Address = require('./model/address');
var Session = require('./model/session');
var Storage = BaseWalletService.Storage;
var TxProposal = require('./model/txproposal');
var Wallet = require('./model/wallet');
var inherits = require('inherits');

var context = {
	Address: Address,
	Session: Session,
	TxProposal: TxProposal,
	Wallet: Wallet
};

function BtcStorage(config) {
  return Storage.apply(this, [context, config]);
};
inherits(BtcStorage, Storage);

// Expose all static methods.
Object.keys(Storage).forEach(function(key) {
  BtcStorage[key] = Storage[key];
});

module.exports = BtcStorage;
