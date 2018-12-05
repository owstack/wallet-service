'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var BaseWallet = BaseWalletService.Model.Wallet;
var Address = require('./address');
var Copayer = require('./copayer');
var inherits = require('inherits');

function BtcWallet(obj) {
	var context = {
		Address: Address,
		Copayer: Copayer
	};

  return BaseWallet.apply(this, [context, obj]);
};
inherits(BtcWallet, BaseWallet);

// Expose all static methods.
Object.keys(BaseWallet).forEach(function(key) {
  BtcWallet[key] = BaseWallet[key];
});

/**
 *
 */
BtcWallet.create = function(obj) {
	var context = {
		Address: Address,
		Copayer: Copayer
	};

	return BaseWallet.create(context, obj);
};

/**
 *
 */
BtcWallet.fromObj = function(obj) {
	var context = {
		Address: Address,
		Copayer: Copayer
	};

	return BaseWallet.fromObj(context, obj);
};

module.exports = BtcWallet;
