'use strict';

var baseService = require('../base-service');
var BlockchainExplorer = baseService.BlockchainExplorer;
var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

function BtcBlockchainExplorer(opts) {
	var context = {
		Networks: Networks
	};

  BlockchainExplorer.apply(this, [context, opts]);
};
inherits(BtcBlockchainExplorer, BlockchainExplorer);

// Expose all static methods.
Object.keys(BlockchainExplorer).forEach(function(key) {
  BtcBlockchainExplorer[key] = BlockchainExplorer[key];
});

module.exports = BtcBlockchainExplorer;
