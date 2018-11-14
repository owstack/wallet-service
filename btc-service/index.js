'use strict';

/**
 * The library for the Bitcoin wallet service.
 * @module BtcWalletService
 */

var BtcWalletService = {};

BtcWalletService.ExpressApp = require('./lib/expressapp');
BtcWalletService.Storage = require('./lib/storage');

module.exports = BtcWalletService;
