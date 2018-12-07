'use strict';

var baseService = require('../../../base-service');
var BaseWalletService = baseService.WalletService;

var BaseSession = BaseWalletService.Model.Session;
var Defaults = require('../common/defaults');
var inherits = require('inherits');

var context = {
	Defaults: Defaults
};

function BtcSession(opts) {
  return BaseSession.apply(this, [context, opts]);
};
inherits(BtcSession, BaseSession);

// Expose all static methods.
Object.keys(BaseSession).forEach(function(key) {
  BtcSession[key] = BaseSession[key];
});

/**
 *
 */
BtcSession.fromObj = function(obj) {
	return BaseSession.fromObj(context, obj);
};

module.exports = BtcSession;
