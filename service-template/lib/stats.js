'use strict';

var cLib = require('../cLib');

var BaseWalletService = require('../../base-service').WalletService;
var BaseStats = BaseWalletService.Stats;

var Networks = cLib.Networks;

var context = {
	Networks: Networks
};

class CStats extends BaseStats {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CStats;
