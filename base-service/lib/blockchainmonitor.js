'use strict';

var owsCommon = require('@owstack/ows-common');
var async = require('async');
var baseConfig = require('../config');
var Constants = owsCommon.Constants;
var Lock = require('./lock');
var log = require('npmlog');
var MessageBroker = require('./messagebroker');
var Notification = require('./model/notification');
var Storage = require('./storage');
var WalletService = require('./server');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;

function BlockchainMonitor(context, config) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.code;
  this.TESTNET = this.ctx.Networks.testnet.code;
  this.COIN = this.ctx.Networks.coin;

  this.config = config || baseConfig;
};

BlockchainMonitor.prototype.start = function(opts, cb) {
  var self = this;
  opts = opts || {};

  async.parallel([
    function(done) {
      self.explorers = {};
      lodash.map([Constants.LIVENET, Constants.TESTNET], function(network) {
        var explorer;
        if (self.config[self.COIN].blockchainExplorers) {
          explorer = self.config[self.COIN].blockchainExplorers[network];
        } else {
          var localConfig = {};
          var provider = self.config[self.COIN].blockchainExplorerOpts.defaultProvider;

          if (self.config[self.COIN].blockchainExplorerOpts && self.config[self.COIN].blockchainExplorerOpts[provider][network]) {
            localConfig = self.config[self.COIN].blockchainExplorerOpts[provider][network];
          }

          var explorer = new self.ctx.BlockchainExplorer({
            provider: provider,
            network: network
          }, self.config);
        }
        $.checkState(explorer);
        self._initExplorer(network, explorer);
        self.explorers[network] = explorer;
      });
      done();
    },
    function(done) {
      if (opts.storage) {
        self.storage = opts.storage;
        done();
      } else {
        self.storage = new Storage();
        self.storage.connect(self.config.storageOpts, done);
      }
    },
    function(done) {
      self.messageBroker = opts.messageBroker || new MessageBroker(self.config.messageBrokerOpts);
      done();
    },
    function(done) {
      self.lock = self.config.lock || new Lock(self.config.lockOpts);
      done();
    },
  ], function(err) {
    if (err) {
      log.error(err);
    }
    return cb(err);
  });
};

BlockchainMonitor.prototype._initExplorer = function(network, explorer) {
  var self = this;

  var socket = explorer.initSocket();

  socket.on('connect', function() {
    log.info('Connected to ' + explorer.getConnectionInfo());
    socket.emit('subscribe', 'inv');
  });
  socket.on('connect_error', function() {
    log.error('Error connecting to ' + explorer.getConnectionInfo());
  });
  socket.on('tx', lodash.bind(self._handleIncomingTx, self));
  socket.on('block', lodash.bind(self._handleNewBlock, self, network));
};

BlockchainMonitor.prototype._handleThirdPartyBroadcasts = function(data, processIt) {
  var self = this;
  if (!data || !data.txid) return;

  self.storage.fetchTxByHash(data.txid, function(err, txp) {
    if (err) {
      log.error('Could not fetch tx from the db');
      return;
    }
    if (!txp || txp.status != 'accepted') return;

    var walletId = txp.walletId;

    if (!processIt) {
      log.info('Detected broadcast ' + data.txid + ' of an accepted txp [' + txp.id + '] for wallet ' + walletId + ' [' + txp.amount + 'sat ]');
      return setTimeout(self._handleThirdPartyBroadcasts.bind(self, data, true), 20 * 1000);
    }

    log.info('Processing accepted txp [' + txp.id + '] for wallet ' + walletId + ' [' + txp.amount + 'sat ]');

    txp.setBroadcasted();

    self.storage.softResetTxHistoryCache(walletId, function() {
      self.storage.storeTx(self.walletId, txp, function(err) {
        if (err)
          log.error('Could not save TX');

        var args = {
          txProposalId: txp.id,
          txid: data.txid,
          amount: txp.getTotalAmount(),
        };

        var notification = Notification.create({
          type: 'NewOutgoingTxByThirdParty',
          data: args,
          walletId: walletId,
          targetNetworks: {
            livenet: self.LIVENET,
            testnet: self.TESTNET
          }
        });
        self._storeAndBroadcastNotification(notification);
      });
    });
  });
};

BlockchainMonitor.prototype._handleIncomingPayments = function(data) {
  var self = this;

  if (!data || !data.vout) return;

  var outs = lodash.compact(lodash.map(data.vout, function(v) {
    var addr = lodash.keys(v)[0];

    return {
      address: addr,
      amount: +v[addr]
    };
  }));
  if (lodash.isEmpty(outs)) return;

  async.each(outs, function(out, next) {
    self.storage.fetchAddress(out.address, function(err, address) {
      if (err) {
        log.error('Could not fetch addresses from the db');
        return next(err);
      }
      if (!address || address.isChange) return next();

      var walletId = address.walletId;
      log.info('Incoming tx for wallet ' + walletId + ' [' + out.amount + 'sat -> ' + out.address + ']');

      var fromTs = Date.now() - 24 * 3600 * 1000;
      self.storage.fetchNotifications(walletId, null, fromTs, function(err, notifications) {
        if (err) return next(err);
        var alreadyNotified = lodash.some(notifications, function(n) {
          return n.type == 'NewIncomingTx' && n.data && n.data.txid == data.txid;
        });
        if (alreadyNotified) {
          log.info('The incoming tx ' + data.txid + ' was already notified');
          return next();
        }

        var notification = Notification.create({
          type: 'NewIncomingTx',
          data: {
            txid: data.txid,
            address: out.address,
            amount: out.amount,
          },
          walletId: walletId,
          targetNetworks: {
            livenet: self.LIVENET,
            testnet: self.TESTNET
          }
        });
        self.storage.softResetTxHistoryCache(walletId, function() {
          self._updateActiveAddresses(address, function() {
            self._storeAndBroadcastNotification(notification, next);
          });
        });
      });
    });
  }, function(err) {
    return;
  });
};

BlockchainMonitor.prototype._updateActiveAddresses = function(address, cb) {
  var self = this;

  self.storage.storeActiveAddresses(address.walletId, address.address, function(err) {
    if (err) {
      log.warn('Could not update wallet cache', err);
    }
    return cb(err);
  });
};

BlockchainMonitor.prototype._handleIncomingTx = function(data) {
  this._handleThirdPartyBroadcasts(data);
  this._handleIncomingPayments(data);
};

BlockchainMonitor.prototype._notifyNewBlock = function(network, hash) {
  var self = this;

  log.info('New ' + network + ' block: ' + hash);
  var notification = Notification.create({
    type: 'NewBlock',
    walletId: network, // use network name as wallet id for global notifications
    data: {
      hash: hash,
      network: network,
    },
    targetNetworks: {
      livenet: self.LIVENET,
      testnet: self.TESTNET
    }
  });

  self.storage.softResetAllTxHistoryCache(function() {
    self._storeAndBroadcastNotification(notification, function(err) {
      return;
    });
  });
};

BlockchainMonitor.prototype._handleTxConfirmations = function(network, hash) {
  var self = this;

  function processTriggeredSubs(subs, cb) {
    async.each(subs, function(sub) {
      log.info('New tx confirmation ' + sub.txid);
      sub.isActive = false;
      self.storage.storeTxConfirmationSub(sub, function(err) {
        if (err) return cb(err);

        var notification = Notification.create({
          type: 'TxConfirmation',
          walletId: sub.walletId,
          creatorId: sub.copayerId,
          data: {
            txid: sub.txid,
            network: network,
            // TODO: amount
          },
          targetNetworks: {
            livenet: self.LIVENET,
            testnet: self.TESTNET
          }
        });
        self._storeAndBroadcastNotification(notification, cb);
      });
    });
  };

  var explorer = self.explorers[network];
  if (!explorer) return;

  explorer.getTxidsInBlock(hash, function(err, txids) {
    if (err) {
      log.error('Could not fetch txids from block ' + hash, err);
      return;
    }

    self.storage.fetchActiveTxConfirmationSubs(null, function(err, subs) {
      if (err) return;
      if (lodash.isEmpty(subs)) return;
      var indexedSubs = lodash.keyBy(subs, 'txid');
      var triggered = [];
      lodash.each(txids, function(txid) {
        if (indexedSubs[txid]) triggered.push(indexedSubs[txid]);
      });
      processTriggeredSubs(triggered, function(err) {
        if (err) {
          log.error('Could not process tx confirmations', err);
        }
        return;
      });
    });
  });
};

BlockchainMonitor.prototype._handleNewBlock = function(network, hash) {
  this._notifyNewBlock(network, hash);
  this._handleTxConfirmations(network, hash);
};

BlockchainMonitor.prototype._storeAndBroadcastNotification = function(notification, cb) {
  var self = this;

  self.storage.storeNotification(notification.walletId, notification, function() {
    self.messageBroker.send(notification)
    if (cb) return cb();
  });
};

module.exports = BlockchainMonitor;
