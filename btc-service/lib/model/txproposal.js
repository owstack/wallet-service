'use strict';

var baseService = require('../../../base-service');
var baseWalletService = baseService.WalletService;

var BaseTxProposal = baseWalletService.Model.TxProposal;
var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var Networks = btcLib.Networks;
var Transaction = btcLib.Transction;
var inherits = require('inherits');

function BtcTxProposal() {
	var context = {
		Address: Address,
		Defaults: Defaults,
		Networks: Networks,
		Transaction: Transaction
	};

  return BaseTxProposal.apply(this, [context]);
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
		Transaction: Transaction
	};

	return BaseTxProposal.fromObj(context, obj);
};

module.exports = BtcTxProposal;
