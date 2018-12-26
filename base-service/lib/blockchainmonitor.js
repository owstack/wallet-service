'use strict';

var owsCommon = require('@owstack/ows-common');
var async = require('async');
var baseConfig = require('../../config');
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

class BlockchainMonitor {
  constructor(context, config) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    context.inject(this);

    // Set some frequently used contant values based on context.
    this.LIVENET = this.ctx.Networks.livenet;
    this.TESTNET = this.ctx.Networks.testnet;

    this.config = config || baseConfig;
    this.setLog();
  }
};

BlockchainMonitor.prototype.setLog = function() {
  if (this.config.log) {
    log.level = (this.config.log.disable == true ? 'silent' : this.config.log.level || 'info');
  } else {
    log.level = 'info';
  }
};

BlockchainMonitor.prototype.start = function(opts, cb) {
  var self = this;
  opts = opts || {};

  async.parallel([
    function(done) {
      self.explorers = {};

      lodash.forEach([self.LIVENET, self.TESTNET], function(network) {
        var explorer;

        if (self.config[network.currency].blockchainExplorers &&
          self.config[network.currency].blockchainExplorers[network.alias]) {

          explorer = self.config[network.currency].blockchainExplorers[network.alias];

        } else {
          var provider = lodash.get(self.config[network.currency], 'blockchainExplorerOpts.defaultProvider');

          if (provider &&
            self.config[network.currency].blockchainExplorerOpts &&
            self.config[network.currency].blockchainExplorerOpts[provider] && 
            self.config[network.currency].blockchainExplorerOpts[provider][network.alias]) {

            var explorer = new self.ctx.BlockchainExplorer({
              provider: provider,
              network: network.alias
            }, self.config);
          }
        }

        if (explorer) {
          self._initExplorer(network.alias, explorer);
          self.explorers[network.alias] = explorer;
        }
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

BlockchainMonitor.prototype._initExplorer = function(networkAlias, explorer) {
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
  socket.on('block', lodash.bind(self._handleNewBlock, self, networkAlias));
};

BlockchainMonitor.prototype._handleThirdPartyBroadcasts = function(data, processIt) {
  var self = this;
  if (!data || !data.txid) {
    return;
  }

  self.storage.fetchTxByHash(data.txid, function(err, txp) {
    if (err) {
      log.error('Could not fetch tx from the db');
      return;
    }
    if (!txp || txp.status != 'accepted') {
      return;
    }

    var walletId = txp.walletId;

    if (!processIt) {
      log.info('Detected broadcast ' + data.txid + ' of an accepted txp [' + txp.id + '] for wallet ' + walletId + ' [' + txp.amount + ' ' + self.ctx.Unit().atomicsName() + ']');
      return setTimeout(self._handleThirdPartyBroadcasts.bind(self, data, true), 20 * 1000);
    }

    log.info('Processing accepted txp [' + txp.id + '] for wallet ' + walletId + ' [' + txp.amount + ' ' + self.ctx.Unit().atomicsName() + ']');

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
          networkName: txp.networkName
        });
        self._storeAndBroadcastNotification(notification);
      });
    });
  });
};

BlockchainMonitor.prototype._handleIncomingPayments = function(data) {
  var self = this;

  if (!data || !data.vout) {
    return;
  }

  var outs = lodash.compact(lodash.map(data.vout, function(v) {
    var addr = lodash.keys(v)[0];

    return {
      address: addr,
      amount: +v[addr]
    };
  }));
  if (lodash.isEmpty(outs)) {
    return;
  }

  async.each(outs, function(out, nextOut) {
    var address;
    var walletId;
    var wallet;

    async.series([function(next) {
      self.storage.fetchAddress(out.address, function(err, addr) {
        if (err) {
          log.error('Could not fetch addresses from the db');
          return nextOut(err);
        }
        if (!addr || addr.isChange) {
          return nextOut();
        }

        address = addr;
        walletId = address.walletId;
        next();
      });

    }, function(next) {
        self.storage.fetchWallet(walletId, function(err, w) {
          if (err) {
            return cb(err);
          }

          wallet = w;
          log.info('Incoming tx for wallet ' + wallet.id + ' [' + out.amount + ' ' + self.ctx.Unit().atomicsName() + ' -> ' + out.address + ']');
          next();
        });

    }, function(next) {
      var fromTs = Date.now() - 24 * 3600 * 1000;

      self.storage.fetchNotifications(walletId, null, fromTs, function(err, notifications) {
        if (err) {
          return nextOut(err);
        }
        var alreadyNotified = lodash.some(notifications, function(n) {
          return n.type == 'NewIncomingTx' && n.data && n.data.txid == data.txid;
        });
        if (alreadyNotified) {
          log.info('The incoming tx ' + data.txid + ' was already notified');
          return nextOut();
        }

        var notification = Notification.create({
          type: 'NewIncomingTx',
          walletId: walletId,
          networkName: wallet.networkName,
          data: {
            txid: data.txid,
            address: out.address,
            amount: out.amount,
          }
        });

        self.storage.softResetTxHistoryCache(walletId, function() {
          self._updateActiveAddresses(address, function() {
            self._storeAndBroadcastNotification(notification, nextOut);
          });
        });
      });
    }]);

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

BlockchainMonitor.prototype._notifyNewBlock = function(networkAlias, hash) {
  var self = this;
  var network = (networkAlias == Constants.LIVENET ? self.LIVENET : self.TESTNET);

  log.info('New ' + networkAlias + ' block: ' + hash);
  var notification = Notification.create({
    type: 'NewBlock',
    walletId: network.name, // use network name as wallet id for global notifications
    networkName: network.name,
    data: {
      hash: hash
    }
  });

  self.storage.softResetAllTxHistoryCache(function() {
    self._storeAndBroadcastNotification(notification, function(err) {
      return;
    });
  });
};

BlockchainMonitor.prototype._handleTxConfirmations = function(networkAlias, hash) {
  var self = this;
  var network = (networkAlias == Constants.LIVENET ? self.LIVENET : self.TESTNET);

  function processTriggeredSubs(subs, cb) {
    async.each(subs, function(sub) {
      log.info('New tx confirmation ' + sub.txid);
      sub.isActive = false;
      self.storage.storeTxConfirmationSub(sub, function(err) {
        if (err) {
          return cb(err);
        }

        var notification = Notification.create({
          type: 'TxConfirmation',
          walletId: sub.walletId,
          creatorId: sub.copayerId,
          networkName: network.name,
          data: {
            txid: sub.txid
            // TODO: amount
          }
        });
        self._storeAndBroadcastNotification(notification, cb);
      });
    });
  };

  var explorer = self.explorers[network];
  if (!explorer) {
    return;
  }

  explorer.getTxidsInBlock(hash, function(err, txids) {
    if (err) {
      log.error('Could not fetch txids from block ' + hash, err);
      return;
    }

    self.storage.fetchActiveTxConfirmationSubs(null, function(err, subs) {
      if (err) {
        return;
      }
      if (lodash.isEmpty(subs)) {
        return;
      }
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

BlockchainMonitor.prototype._handleNewBlock = function(networkAlias, hash) {
  this._notifyNewBlock(networkAlias, hash);
  this._handleTxConfirmations(networkAlias, hash);
};

BlockchainMonitor.prototype._storeAndBroadcastNotification = function(notification, cb) {
  var self = this;

  self.storage.storeNotification(notification.walletId, notification, function() {
    self.messageBroker.send(notification)
    if (cb) return cb();
  });
};

module.exports = BlockchainMonitor;
