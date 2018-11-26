'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var BaseAddress = BaseWalletService.Model.Address;
var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var inherits = require('inherits');

function BtcAddress() {
	var context = {
		Address: Address
	};

  return BaseAddress.apply(this, [context]);
};
inherits(BtcAddress, BaseAddress);

// Expose all static methods.
Object.keys(BaseAddress).forEach(function(key) {
  BtcAddress[key] = BaseAddress[key];
});

/**
 *
 */
BtcAddress.create = function(opts) {
	var context = {
		Address: Address
	};

	return BaseAddress.create(context, opts);
};

/**
 *
 */
BtcAddress.fromObj = function(obj) {
	var context = {
		Address: Address
	};

	return BaseAddress.fromObj(context, obj);
};

module.exports = BtcAddress;
