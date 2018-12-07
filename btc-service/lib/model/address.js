'use strict';

var cLib = require('@owstack/btc-lib');

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseAddress = BaseWalletService.Model.Address;

var Address = cLib.Address;
var inherits = require('inherits');

var context = {
	Address: Address
};

function CAddress() {
  return BaseAddress.apply(this, [context]);
};
inherits(CAddress, BaseAddress);

// Expose all static methods.
Object.keys(BaseAddress).forEach(function(key) {
  CAddress[key] = BaseAddress[key];
});

/**
 *
 */
CAddress.create = function(opts) {
	return BaseAddress.create(context, opts);
};

/**
 *
 */
CAddress.fromObj = function(obj) {
	return BaseAddress.fromObj(context, obj);
};

module.exports = CAddress;
