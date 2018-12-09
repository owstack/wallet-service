'use strict';

/**
 * The base library for the wallet service.
 * @module BaseWalletService
 */

var BlockchainMonitor = require('./blockchainmonitor/blockchainmonitor');
var EmailService = require('./emailservice/emailservice');
var MessageBroker = require('./messagebroker/messagebroker');
var Node = require('./node/node');
var PushNotificationsService = require('./pushnotificationsservice/pushnotificationsservice');
var WalletService = require('./lib');

module.exports = {
  BlockchainMonitor: BlockchainMonitor,
	EmailService: EmailService,
	MessageBroker: MessageBroker,
	Node: Node,
	PushNotificationsService: PushNotificationsService,
	WalletService: WalletService
};
