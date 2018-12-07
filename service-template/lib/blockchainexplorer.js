'use strict';

var cLib = require('../cLib');

var baseService = require('../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseBlockchainExplorer = BaseWalletService.BlockchainExplorer;

var Explorer = require('./blockchainexplorers/explorer');
var Networks = cLib.Networks;
var Server = require('./server');
var inherits = require('inherits');

var context = {
	Explorer: Explorer,
	Networks: Networks,
	Server: Server
};

function CBlockchainExplorer(opts, config) {
	// Returns a different class.
  return BaseBlockchainExplorer.apply(this, [context, opts, config]);
};
inherits(CBlockchainExplorer, BaseBlockchainExplorer);

// Expose all static methods.
Object.keys(BaseBlockchainExplorer).forEach(function(key) {
  CBlockchainExplorer[key] = BaseBlockchainExplorer[key];
});

module.exports = CBlockchainExplorer;
