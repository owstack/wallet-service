'use strict';

var BaseWalletService = require('../../../base-service').WalletService;
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
