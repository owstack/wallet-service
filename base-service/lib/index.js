/**
 * The base wallet service.
 * @module Base Service
 */

const WalletService = {};

WalletService.BlockchainExplorer = require('./blockchainexplorer');
WalletService.BlockchainExplorers = require('./blockchainexplorers');
WalletService.BlockchainMonitor = require('./blockchainmonitor');
WalletService.Common = require('./common');
WalletService.EmailService = require('./emailservice');
WalletService.Errors = require('./errors');
WalletService.ExpressApp = require('./expressapp');
WalletService.FiatRateProviders = require('./fiatrateproviders');
WalletService.FiatRateService = require('./fiatrateservice');
WalletService.LocalLock = require('./locallock');
WalletService.Lock = require('./lock');
WalletService.MessageBroker = require('./messagebroker');
WalletService.Model = require('./model');
WalletService.NotificationBroadcaster = require('./notificationbroadcaster');
WalletService.PushNotificationsService = require('./pushnotificationsservice');
WalletService.Server = require('./server');
WalletService.Stats = require('./stats');
WalletService.Storage = require('./storage');

module.exports = WalletService;
