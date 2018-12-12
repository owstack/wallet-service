'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseSession = BaseWalletService.Model.Session;

var Defaults = require('../common/defaults');

var context = {
	Defaults: Defaults
};

class CSession extends BaseSession {
	constructor(opts) {
	  super(context, opts);
	}
};

/**
 *
 */
CSession.fromObj = function(obj) {
	return BaseSession.fromObj(context, obj);
};

module.exports = CSession;
