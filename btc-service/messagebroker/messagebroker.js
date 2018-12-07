#!/usr/bin/env node

'use strict';

var cLib = require('@owstack/btc-lib');

var baseService = require('../../base-service');
var BaseMessageBroker = baseService.MessageBroker;

var Networks = cLib.Networks;
var inherits = require('inherits');

var context = {
	Networks: Networks
};

function CMessageBroker(config) {
  BaseMessageBroker.apply(this, [context, config]);
};
inherits(CMessageBroker, BaseMessageBroker);

// Expose all static methods.
Object.keys(BaseMessageBroker).forEach(function(key) {
  CMessageBroker[key] = BaseMessageBroker[key];
});

// Start the service with base configuration (default).
var service = new CMessageBroker();
service.start();
