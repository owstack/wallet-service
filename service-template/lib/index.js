'use strict';

var WalletService = require('../../base-service').WalletService;

WalletService.BlockchainExplorer = require('./blockchainexplorer');
WalletService.BlockchainExplorers = require('./blockchainexplorers');
WalletService.BlockchainMonitor = require('./blockchainmonitor');
WalletService.Common = require('./common');
WalletService.EmailService = require('./emailservice');
WalletService.PushNotificationsService = require('./pushnotificationsservice');
WalletService.Model = require('./model');
WalletService.Server = require('./server');
WalletService.Stats = require('./stats');
WalletService.Storage = require('./storage');

module.exports = WalletService;
