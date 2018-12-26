'use strict';

var owsCommon = require('@owstack/ows-common');
var Context = owsCommon.util.Context;

var BaseWalletService = require('../../../base-service').WalletService;
var BaseSession = BaseWalletService.Model.Session;

var Defaults = require('../common/defaults');

var context = new Context({
	Defaults: Defaults
});

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
