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

function BtcUtils() {
  if (!(this instanceof BtcUtils)) {
    return new BtcUtils();
  }

  return Utils.apply(this, [context]);
};
inherits(BtcUtils, Utils);

// Expose all static methods.
Object.keys(Utils).forEach(function(key) {
  BtcUtils[key] = Utils[key];
});

module.exports = BtcUtils;
