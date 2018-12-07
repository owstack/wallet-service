'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var BaseWallet = BaseWalletService.Model.Wallet;
var Address = require('./address');
var Copayer = require('./copayer');
var inherits = require('inherits');

var context = {
	Address: Address,
	Copayer: Copayer
};

function BtcWallet(obj) {
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
	return BaseWallet.create(context, obj);
};

/**
 *
 */
BtcWallet.fromObj = function(obj) {
	return BaseWallet.fromObj(context, obj);
};

module.exports = BtcWallet;
