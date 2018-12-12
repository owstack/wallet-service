'use strict';

var cLib = require('../../cLib');

var BaseWalletService = require('../../../base-service').WalletService;
var BaseUtils = BaseWalletService.Common.Utils;

var Unit = cLib.Unit;

var context = {
	Unit: Unit
};

class CUtils extends BaseUtils {
	constructor() {
	  super(context);
	}
};

module.exports = CUtils;
