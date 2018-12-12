'use strict';

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseStorage = BaseWalletService.Storage;

var Address = require('./model/address');
var Session = require('./model/session');
var TxProposal = require('./model/txproposal');
var Wallet = require('./model/wallet');

var context = {
	Address: Address,
	Session: Session,
	TxProposal: TxProposal,
	Wallet: Wallet
};

class CStorage extends BaseStorage {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CStorage;
