'use strict';

var cLib = require('../../cLib');

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseAddress = BaseWalletService.Model.Address;

var Address = cLib.Address;

var context = {
	Address: Address
};

class CAddress extends BaseAddress {
	constructor() {
	  super(context);
	}
};

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
