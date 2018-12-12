'use strict';

/**
 * The base library for the wallet service.
 * @module BaseWalletService
 */

var Service = {};

Service.BlockchainMonitor = require('./blockchainmonitor/blockchainmonitor');
Service.EmailService = require('./emailservice/emailservice');
Service.Node = require('./node/node');
Service.PushNotificationsService = require('./pushnotificationsservice/pushnotificationsservice');
Service.WalletService = require('./lib');

module.exports = Service;
