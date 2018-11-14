#!/usr/bin/env node

'use strict';

var config = require('../config');
var log = require('npmlog');
var PushNotificationsService = require('../lib/pushnotificationsservice');

log.debug = log.verbose;
log.level = 'debug';

var pushNotificationsService = new PushNotificationsService();

pushNotificationsService.start(config, function(err) {
  if (err) {
  	throw err;
  }

  log.debug('Push Notification Service started');
});
