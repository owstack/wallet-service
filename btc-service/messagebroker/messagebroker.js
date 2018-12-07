#!/usr/bin/env node

'use strict';

var baseService = require('../../base-service');
var BaseMessageBroker = baseService.MessageBroker;

var btcLib = require('@owstack/btc-lib');
var Networks = btcLib.Networks;
var inherits = require('inherits');

var context = {
	Networks: Networks
};

function BtcMessageBroker(config) {
  BaseMessageBroker.apply(this, [context, config]);
};
inherits(BtcMessageBroker, BaseMessageBroker);

// Expose all static methods.
Object.keys(BaseMessageBroker).forEach(function(key) {
  BtcMessageBroker[key] = BaseMessageBroker[key];
});

// Start the service with base configuration (default).
var service = new BtcMessageBroker();
service.start();
