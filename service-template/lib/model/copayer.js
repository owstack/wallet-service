'use strict';

var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../../base-service').WalletService;
var BaseCopayer = BaseWalletService.Model.Copayer;

var Address = require('./address');
var Context = owsCommon.util.Context;

var context = new Context({
	Address: Address
});

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
