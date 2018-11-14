'use strict';

var baseService = require('../base-service');
var Session = baseService.Model.Session;
var btcLib = require('@owstack/btc-lib');
var Defaults = btcLib.Defaults;
var inherits = require('inherits');

function BtcSession(opts) {
	var context = {
		Defaults: Defaults
	};

  Session.apply(this, [context, opts]);
};
inherits(BtcSession, Session);

// Expose all static methods.
Object.keys(Session).forEach(function(key) {
  BtcSession[key] = Session[key];
});

/**
 *
 */
BtcSession.fromObj = function(obj) {
	var context = {
		Defaults: Defaults
	};

	return Session.fromObj(context, obj);
};

module.exports = BtcSession;
