'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var BaseTxProposal = BaseWalletService.Model.TxProposal;
var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var Defaults = require('../common/defaults');
var Networks = btcLib.Networks;
var Transaction = btcLib.Transaction;
var inherits = require('inherits');

function BtcTxProposal(opts) {
	var context = {
		Address: Address,
		Defaults: Defaults,
		Networks: Networks,
		Transaction: Transaction
	};

  return BaseTxProposal.apply(this, [context, opts]);
};
inherits(BtcTxProposal, BaseTxProposal);

// Expose all static methods.
Object.keys(BaseTxProposal).forEach(function(key) {
  BtcTxProposal[key] = BaseTxProposal[key];
});

/**
 *
 */
BtcTxProposal.fromObj = function(obj) {
	var context = {
		Address: Address,
		Defaults: Defaults,
		Networks: Networks,
		Transaction: Transaction
	};

	return BaseTxProposal.fromObj(context, obj);
};

module.exports = BtcTxProposal;
