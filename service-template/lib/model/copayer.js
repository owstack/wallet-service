'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseCopayer = BaseWalletService.Model.Copayer;

var Address = require('./address');

var context = {
	Address: Address
};

class CCopayer extends BaseCopayer {
	constructor() {
	  super(context);
	}
};

/**
 *
 */
CCopayer.create = function(opts) {
	return BaseCopayer.create(context, opts);
};

/**
 *
 */
CCopayer.fromObj = function(obj) {
	return BaseCopayer.fromObj(context, obj);
};

module.exports = CCopayer;
