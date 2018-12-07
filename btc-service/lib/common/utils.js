'use strict';

var cLib = require('@owstack/btc-lib');

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseUtils = BaseWalletService.Common.Utils;

var Unit = cLib.Unit;
var inherits = require('inherits');

var context = {
	Unit: Unit
};

function CUtils() {
  if (!(this instanceof CUtils)) {
    return new CUtils();
  }

  return BaseUtils.apply(this, [context]);
};
inherits(CUtils, BaseUtils);

// Expose all static methods.
Object.keys(BaseUtils).forEach(function(key) {
  CUtils[key] = BaseUtils[key];
});

module.exports = CUtils;
