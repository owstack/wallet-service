'use strict';

var cLib = require('../../cLib');

var BaseWalletService = require('../../../base-service').WalletService;
var BaseAddress = BaseWalletService.Model.Address;

var Address = cLib.Address;
var Networks = cLib.Networks;

var context = {
	Address: Address,
	Networks: Networks
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
