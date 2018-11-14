'use strict';

/**
 * The base library for the wallet service.
 * @module BaseWalletService
 */

var BaseWalletService = {};

BaseWalletService.ExpressApp = require('./lib/expressapp');
BaseWalletService.Storage = require('./lib/storage');

module.exports = BaseWalletService;
