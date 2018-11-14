'use strict';

/**
 * The BTC wallet service.
 * @module BTC Service
 */

var BtcService = {};

BtcService.BlockchainExplorer = require('./baseblockchainexplorer');
BtcService.BlockchainExplorers = require('./baseblockchainexplorers');
BtcService.BlockchainMonitor = require('./blockchainmonitor');
BtcService.ExpressApp = require('./expressapp');
BtcService.FiatRateService = require('./fiatrateservice');
BtcService.Model = require('./model');
BtcService.Server = require('./server');
BtcService.Stats = require('./stats');

module.exports = BtcService;
