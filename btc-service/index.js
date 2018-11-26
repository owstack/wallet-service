'use strict';

/**
 * The library for the Bitcoin wallet service.
 * @module BtcService
 */

var Service = require('../base-service');

//Service.BlockchainMonitor = require('./blockchainmonitor/blockchainmonitor');
//Service.EmailService = require('./emailservice/emailservice');
//Service.Node = require('./node/node');
//Service.PushNotificationsService = require('./pushnotificationsservice/pushnotificationsservice');
Service.WalletService = require('./lib');

module.exports = Service;
