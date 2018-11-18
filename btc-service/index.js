'use strict';

/**
 * The library for the Bitcoin wallet service.
 * @module BtcService
 */

var Service = require('../base-service');

Service.BlockchainMonitor = require('./blockchainmonitor/blockchainmonitor');
Service.EmailService = require('./emailservice/emailservice');
Service.FiatRateService = require('./fiatrateservice/fiatrateservice');
Service.Node = require('./node/node');
Service.PushNotificationsService = require('./pushnotificationsservice/pushnotificationsservice');

var Lib = require('./lib');
var Common = Lib.Common;
var Model = Lib.Model;

Service.WalletService.BlockchainExplorer = Lib.BlockchainExplorer;
Service.WalletService.BlockchainExplorers.Explorer = Lib.BlockchainExplorers.Explorer;
Service.WalletService.BlockchainMonitor = Lib.BlockchainMonitor;
Service.WalletService.Defaults = Common.Defaults;
Service.WalletService.ExpressApp = Lib.ExpressApp;
Service.WalletService.FiatRateService = Lib.FiatRateService;
Service.WalletService.Model.Address = Model.Address;
Service.WalletService.Model.Session = Model.Session;
Service.WalletService.Model.TxProposal = Model.TxProposal;
Service.WalletService.Server = Lib.Server;
Service.WalletService.Stats = Lib.Stats;

module.exports = Service;
