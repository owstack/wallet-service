'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var btcLib = require('@owstack/btc-lib');
var Unit = btcLib.Unit;
var Utils = BaseWalletService.Common.Utils;
var inherits = require('inherits');

var context = {
	Unit: Unit
};

function CUtils() {
  if (!(this instanceof CUtils)) {
    return new CUtils();
  }

  return Utils.apply(this, [context]);
};
inherits(CUtils, Utils);

// Expose all static methods.
Object.keys(Utils).forEach(function(key) {
  CUtils[key] = Utils[key];
});

module.exports = CUtils;
