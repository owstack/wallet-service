'use strict';

var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BaseStorage = BaseWalletService.Storage;

var Address = require('./model/address');
var Session = require('./model/session');
var TxProposal = require('./model/txproposal');
var Wallet = require('./model/wallet');

var context = new Context({
	Address: Address,
	Session: Session,
	TxProposal: TxProposal,
	Wallet: Wallet
});

class CStorage extends BaseStorage {
	constructor(config, opts) {
	  super(context, config, opts);
	}
};

module.exports = CStorage;
