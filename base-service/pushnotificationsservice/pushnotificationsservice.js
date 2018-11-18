#!/usr/bin/env node

'use strict';

var log = require('npmlog');
var PushNotificationsService = require('../lib/pushnotificationsservice');

log.debug = log.verbose;
log.level = 'debug';

var Service = function(context) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

	this.pushNotificationsService = new PushNotificationsService();	
};

Service.prototype.start = function() {
	this.pushNotificationsService.start(this.ctx.config, function(err) {
	  if (err) {
	  	throw err;
	  }

	  log.debug('Push Notification service started');
	});
};

module.exports = Service;
