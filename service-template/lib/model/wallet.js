'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseWallet = BaseWalletService.Model.Wallet;

var Address = require('./address');
var Copayer = require('./copayer');

var context = {
	Address: Address,
	Copayer: Copayer
};

class CWallet extends BaseWallet {
	constructor(obj) {
	  super(context, obj);
	}
};

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
