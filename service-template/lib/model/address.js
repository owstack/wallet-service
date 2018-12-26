'use strict';

var cLib = require('../../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../../base-service').WalletService;
var BaseAddress = BaseWalletService.Model.Address;

var Address = cLib.Address;
var Networks = cLib.Networks;

var context = new Context({
	Address: Address,
	Networks: Networks
});

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
