'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var BaseCopayer = BaseWalletService.Model.Copayer;
var Address = require('./address');
var inherits = require('inherits');

var context = {
	Address: Address
};

function BtcCopayer(opts) {
  return BaseCopayer.apply(this, [context, opts]);
};
inherits(BtcCopayer, BaseCopayer);

// Expose all static methods.
Object.keys(BaseCopayer).forEach(function(key) {
  BtcCopayer[key] = BaseCopayer[key];
});

/**
 *
 */
BtcCopayer.create = function(opts) {
	return BaseCopayer.create(context, opts);
};

/**
 *
 */
BtcCopayer.fromObj = function(obj) {
	return BaseCopayer.fromObj(context, obj);
};

module.exports = BtcCopayer;
