'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseCopayer = BaseWalletService.Model.Copayer;

var Address = require('./address');
var inherits = require('inherits');

var context = {
	Address: Address
};

function CCopayer(opts) {
  return BaseCopayer.apply(this, [context, opts]);
};
inherits(CCopayer, BaseCopayer);

// Expose all static methods.
Object.keys(BaseCopayer).forEach(function(key) {
  CCopayer[key] = BaseCopayer[key];
});

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
