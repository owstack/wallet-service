'use strict';

var cLib = require('../cLib');
var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../base-service').WalletService;
var BaseStats = BaseWalletService.Stats;

var Networks = cLib.Networks;

var context = new Context({
	Networks: Networks
});

class CStats extends BaseStats {
	constructor(config) {
	  super(context, config);
	}
};

module.exports = CStats;
