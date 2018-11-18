'use strict';

/**
 * The base library for the wallet service.
 * @module BaseWalletService
 */

var BlockchainMonitor = require('./blockchainmonitor/blockchainmonitor');
//var DB = require('./db');
var EmailService = require('./emailservice/emailservice');
var FiatRateService = require('./fiatrateservice/fiatrateservice');
var Locker = require('./locker/locker');
var MessageBroker = require('./messagebroker/messagebroker');
var Node = require('./node/node');
var PushNotificationsService = require('./pushnotificationsservice/pushnotificationsservice');
var WalletService = require('./lib');

module.exports = {
  BlockchainMonitor: BlockchainMonitor,
	//DB: DB,
	EmailService: EmailService,
	FiatRateService: FiatRateService,
	Locker: Locker,
	MessageBroker: MessageBroker,
	Node: Node,
	PushNotificationsService: PushNotificationsService,
	WalletService: WalletService
};
