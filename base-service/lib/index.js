'use strict';

/**
 * The base wallet service.
 * @module Base Service
 */

var BaseService = {};
var BaseCommon = require('./common');

BaseService.BlockchainExplorer = require('./baseblockchainexplorer');
BaseService.BlockchainExplorers = require('./baseblockchainexplorers');
BaseService.BlockchainMonitor = require('./blockchainmonitor');
BaseService.EmailService = require('./emailservice');
BaseService.Errors = require('./errors');
BaseService.ExpressApp = require('./expressapp');
BaseService.FiatRateProviders = require('./fiatrateproviders');
BaseService.FiatRateService = require('./fiatrateservice');
BaseService.LocalLock = require('./locallock');
BaseService.Lock = require('./lock');
BaseService.MessageBroker = require('./messagebroker');
BaseService.Model = require('./model');
BaseService.Node = require('./node');
BaseService.NotificationBroadcaster = require('./notificationbroadcaster');
BaseService.PushNotificationService = require('./pushnotificationservice');
BaseService.Server = require('./server');
BaseService.Stats = require('./stats');
BaseService.Storage = require('./storage');
BaseService.Utils = BaseCommon.Utils;

module.exports = BaseService;
