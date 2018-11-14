'use strict';

var events = require('events');
var log = require('npmlog');
var inherits = require('inherits');
var nodeutil = require('util');

log.debug = log.verbose;

function NotificationBroadcaster() {};

nodeutil.inherits(NotificationBroadcaster, events.EventEmitter);

NotificationBroadcaster.prototype.broadcast = function(eventName, notification, walletService) {
  this.emit(eventName, notification, walletService);
};

var _instance;
NotificationBroadcaster.singleton = function() {
  if (!_instance) {
    _instance = new NotificationBroadcaster();
  }
  return _instance;
};

module.exports = NotificationBroadcaster.singleton();
