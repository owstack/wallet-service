'use strict';

var cLib = require('../../cLib');

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
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
