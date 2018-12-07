'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;
var BaseSession = BaseWalletService.Model.Session;

var Defaults = require('../common/defaults');
var inherits = require('inherits');

var context = {
	Defaults: Defaults
};

function CSession(opts) {
  return BaseSession.apply(this, [context, opts]);
};
inherits(CSession, BaseSession);

// Expose all static methods.
Object.keys(BaseSession).forEach(function(key) {
  CSession[key] = BaseSession[key];
});

/**
 *
 */
CSession.fromObj = function(obj) {
	return BaseSession.fromObj(context, obj);
};

module.exports = CSession;
