'use strict';

var cLib = require('../../cLib');

var BaseWalletService = require('../../../base-service').WalletService;
var BaseTxProposal = BaseWalletService.Model.TxProposal;

var Address = cLib.Address;
var Defaults = require('../common/defaults');
var Networks = cLib.Networks;
var Transaction = cLib.Transaction;
var Unit = cLib.Unit;

var context = {
	Address: Address,
	Defaults: Defaults,
	Networks: Networks,
	Transaction: Transaction,
	Unit: Unit
};

class CTxProposal extends BaseTxProposal {
	constructor(opts) {
	  super(context, opts);
	}
};

/**
 *
 */
CTxProposal.fromObj = function(obj) {
	return BaseTxProposal.fromObj(context, obj);
};

module.exports = CTxProposal;
