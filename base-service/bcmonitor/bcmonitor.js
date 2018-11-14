#!/usr/bin/env node

'use strict';

var BlockchainMonitor = require('../lib/blockchainmonitor');
var config = require('../config');
var log = require('npmlog');

log.debug = log.verbose;
var bcm = new BlockchainMonitor();

bcm.start(config, function(err) {
  if (err) {
  	throw err;
  }

  console.log('Blockchain monitor started');
});
