'use strict';

var baseService = require('../base-service');
var BaseAddress = baseService.Model.Address;
var btcLib = require('@owstack/btc-lib');
var Address = btcLib.Address;
var Transaction = btcLib.Transaction;
var inherits = require('inherits');

function BtcAddress() {
	var context = {
		Address: Address,
		Transaction: Transaction
	};

  BaseAddress.apply(this, [context]);
};
inherits(BtcAddress, BaseAddress);

// Expose all static methods.
Object.keys(BaseAddress).forEach(function(key) {
  BtcAddress[key] = BaseAddress[key];
});

/**
 *
 */
BtcAddress.fromObj = function(obj) {
	var context = {
		Address: Address,
		Transaction: Transaction
	};

	return BaseAddress.fromObj(context, obj);
};

module.exports = BtcAddress;
