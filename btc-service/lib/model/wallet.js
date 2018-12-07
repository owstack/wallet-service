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

function CWallet(obj) {
  return BaseWallet.apply(this, [context, obj]);
};
inherits(CWallet, BaseWallet);

// Expose all static methods.
Object.keys(BaseWallet).forEach(function(key) {
  CWallet[key] = BaseWallet[key];
});

/**
 *
 */
CWallet.create = function(obj) {
	return BaseWallet.create(context, obj);
};

/**
 *
 */
CWallet.fromObj = function(obj) {
	return BaseWallet.fromObj(context, obj);
};

module.exports = CWallet;
