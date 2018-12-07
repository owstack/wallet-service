'use strict';

var cLib = require('../../cLib');

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseExplorer = BaseWalletService.BlockchainExplorers.Explorer;

var Networks = cLib.Networks;
var inherits = require('inherits');

var context = {
	Networks: Networks
};

function CExplorer(opts) {
  return BaseExplorer.apply(this, [context, opts]);
};
inherits(CExplorer, BaseExplorer);

// Expose all static methods.
Object.keys(BaseExplorer).forEach(function(key) {
  CExplorer[key] = BaseExplorer[key];
});

module.exports = CExplorer;
