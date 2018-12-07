'use strict';

/**
 * The library for the Bitcoin wallet service.
 * @module BtcService
 */

var Service = require('../base-service');

Service.Node = require('./node/node');
Service.WalletService = require('./lib');

module.exports = Service;
