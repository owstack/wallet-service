'use strict';

var baseConfig = require('../../config');
var events = require('events');
var inherits = require('inherits');
var log = require('npmlog');
var $ = require('preconditions').singleton();

log.debug = log.verbose;
log.disableColor();

class MessageBroker extends events.EventEmitter {
  constructor(config) {
    super();
    var self = this;
    config = config || baseConfig;

    if (config.messageBrokerServer) {
      var url = config.messageBrokerServer.url;
      this.remote = true;
      this.mq = require('socket.io-client').connect(url);
      this.mq.on('connect', function() {});
      this.mq.on('connect_error', function() {
        log.warn('Error connecting to message broker server @ ' + url);
      });

      this.mq.on('msg', function(data) {
        self.emit('msg', data);
      });

      log.info('Using message broker server at ' + url);
    }
  }
};

MessageBroker.isNotificationForMe = function(notification, coin) {
  return notification.targetNetwork.coin == coin;
};

MessageBroker.prototype.send = function(data) {
  if (this.remote) {
    this.mq.emit('msg', data);
  } else {
    this.emit('msg', data);
  }
};

MessageBroker.prototype.onMessage = function(handler) {
  this.on('msg', handler);
};

module.exports = MessageBroker;
