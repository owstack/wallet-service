'use strict';

var baseService = require('../../base-service');
var BaseEmailService = baseService.EmailService;

var config = require('../config');
var inherits = require('inherits');

function BtcEmailService(opts) {
	var context = {
		config: config
	};

  BaseEmailService.apply(this, [context, opts]);
};
inherits(BtcEmailService, BaseEmailService);

// Expose all static methods.
Object.keys(BaseEmailService).forEach(function(key) {
  BtcEmailService[key] = BaseEmailService[key];
});

module.exports = BtcEmailService;
