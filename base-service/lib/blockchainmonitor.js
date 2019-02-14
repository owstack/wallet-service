const owsCommon = require('@owstack/ows-common');
const async = require('async');
const baseConfig = require('config');
const Constants = owsCommon.Constants;
const Context = owsCommon.util.Context;
const Lock = require('./lock');
const log = require('npmlog');
const MessageBroker = require('./messagebroker');
const Notification = require('./model/notification');
const Storage = require('./storage');
const WalletService = require('./server');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

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
}

BlockchainMonitor.prototype.setLog = function () {
    if (this.config.log) {
        log.level = (this.config.log.disable == true ? 'silent' : this.config.log.level || 'info');
    } else {
        log.level = 'info';
    }
};

BlockchainMonitor.prototype.start = function (opts, cb) {
    const self = this;
    opts = opts || {};

    async.parallel([
        function (done) {
            self.explorers = {};

            lodash.forEach([self.LIVENET, self.TESTNET], function (network) {
                let explorer;

                if (self.config[network.currency].blockchainExplorers &&
          self.config[network.currency].blockchainExplorers[network.alias]) {

                    explorer = self.config[network.currency].blockchainExplorers[network.alias];

                } else {
                    const provider = lodash.get(self.config[network.currency], 'blockchainExplorerOpts.defaultProvider');

                    if (provider &&
            self.config[network.currency].blockchainExplorerOpts &&
            self.config[network.currency].blockchainExplorerOpts[provider] &&
            self.config[network.currency].blockchainExplorerOpts[provider][network.alias]) {

                        explorer = new self.ctx.BlockchainExplorer({
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
        function (done) {
            if (opts.storage) {
                self.storage = opts.storage;
                done();
            } else if (self.config.storage) {
                self.storage = self.config.storage;
                done();
            } else {
                // Create with empty context (none for this service).
                self.storage = new Storage(new Context(), self.config.storageOpts, {
                    creator: `BlockchainMonitor (${  self.LIVENET.currency  })`
                });
                self.storage.connect(done);
            }
        },
        function (done) {
            self.messageBroker = opts.messageBroker || new MessageBroker(self.config.messageBrokerOpts);
            done();
        },
        function (done) {
            self.lock = self.config.lock || new Lock(self.config.lockOpts);
            done();
        },
    ], function (err) {
        if (err) {
            log.error(err);
        }
        return cb(err);
    });
};

BlockchainMonitor.prototype._initExplorer = function (networkAlias, explorer) {
    const self = this;

    const socket = explorer.initSocket();

    socket.on('connect', function () {
        log.info(`Connected to ${  explorer.getConnectionInfo()}`);
        socket.emit('subscribe', 'inv');
    });
    socket.on('connect_error', function () {
        log.error(`Error connecting to ${  explorer.getConnectionInfo()}`);
    });
    socket.on('tx', lodash.bind(self._handleIncomingTx, self));
    socket.on('block', lodash.bind(self._handleNewBlock, self, networkAlias));
};

BlockchainMonitor.prototype._handleThirdPartyBroadcasts = function (data, processIt) {
    const self = this;
    if (!data || !data.txid) {
        return;
    }

    self.storage.fetchTxByHash(data.txid, function (err, txp) {
        if (err) {
            log.error('Could not fetch tx from the db');
            return;
        }
        if (!txp || txp.status != 'accepted') {
            return;
        }

        const walletId = txp.walletId;

        if (!processIt) {
            log.info(`Detected broadcast ${  data.txid  } of an accepted txp [${  txp.id  }] for wallet ${  walletId  } [${  txp.amount  } ${  self.ctx.Unit().atomicsAccessor()  }]`);
            return setTimeout(self._handleThirdPartyBroadcasts.bind(self, data, true), 20 * 1000);
        }

        log.info(`Processing accepted txp [${  txp.id  }] for wallet ${  walletId  } [${  txp.amount  } ${  self.ctx.Unit().atomicsAccessor()  }]`);

        txp.setBroadcasted();

        self.storage.softResetTxHistoryCache(walletId, function () {
            self.storage.storeTx(self.walletId, txp, function (err) {
                if (err) {
                    log.error('Could not save TX');
                }

                const args = {
                    txProposalId: txp.id,
                    txid: data.txid,
                    amount: txp.getTotalAmount(),
                };

                const notification = Notification.create({
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

BlockchainMonitor.prototype._handleIncomingPayments = function (data) {
    const self = this;

    if (!data || !data.vout) {
        return;
    }

    const outs = lodash.compact(lodash.map(data.vout, function (v) {
        const addr = lodash.keys(v)[0];

        return {
            address: addr,
            amount: +v[addr]
        };
    }));
    if (lodash.isEmpty(outs)) {
        return;
    }

    async.each(outs, function (out, nextOut) {
        let address;
        let walletId;
        let wallet;

        async.series([function (next) {
            self.storage.fetchAddress(out.address, function (err, addr) {
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

        }, function (next) {
            self.storage.fetchWallet(walletId, function (err, w) {
                if (err) {
                    return next(err);
                }

                wallet = w;
                log.info(`Incoming tx for wallet ${  wallet.id  } [${  out.amount  } ${  self.ctx.Unit().atomicsAccessor()  } -> ${  out.address  }]`);
                next();
            });

        }, function (next) {
            const fromTs = Date.now() - 24 * 3600 * 1000;

            self.storage.fetchNotifications(walletId, null, fromTs, function (err, notifications) {
                if (err) {
                    return nextOut(err);
                }
                const alreadyNotified = lodash.some(notifications, function (n) {
                    return n.type == 'NewIncomingTx' && n.data && n.data.txid == data.txid;
                });
                if (alreadyNotified) {
                    log.info(`The incoming tx ${  data.txid  } was already notified`);
                    return nextOut();
                }

                const notification = Notification.create({
                    type: 'NewIncomingTx',
                    walletId: walletId,
                    networkName: wallet.networkName,
                    data: {
                        txid: data.txid,
                        address: out.address,
                        amount: out.amount,
                    }
                });

                self.storage.softResetTxHistoryCache(walletId, function () {
                    self._updateActiveAddresses(address, function () {
                        self._storeAndBroadcastNotification(notification, nextOut);
                    });
                });
            });
        }]);

    }, function (err) {
        return;
    });
};

BlockchainMonitor.prototype._updateActiveAddresses = function (address, cb) {
    const self = this;

    self.storage.storeActiveAddresses(address.walletId, address.address, function (err) {
        if (err) {
            log.warn('Could not update wallet cache', err);
        }
        return cb(err);
    });
};

BlockchainMonitor.prototype._handleIncomingTx = function (data) {
    this._handleThirdPartyBroadcasts(data);
    this._handleIncomingPayments(data);
};

BlockchainMonitor.prototype._notifyNewBlock = function (networkAlias, hash) {
    const self = this;
    const network = (networkAlias == Constants.LIVENET ? self.LIVENET : self.TESTNET);

    log.info(`New ${  networkAlias  } block: ${  hash}`);
    const notification = Notification.create({
        type: 'NewBlock',
        walletId: network.name, // use network name as wallet id for global notifications
        networkName: network.name,
        data: {
            hash: hash
        }
    });

    self.storage.softResetAllTxHistoryCache(function () {
        self._storeAndBroadcastNotification(notification, function (err) {
            return;
        });
    });
};

BlockchainMonitor.prototype._handleTxConfirmations = function (networkAlias, hash) {
    const self = this;
    const network = (networkAlias == Constants.LIVENET ? self.LIVENET : self.TESTNET);

    function processTriggeredSubs(subs, cb) {
        async.each(subs, function (sub) {
            log.info(`New tx confirmation ${  sub.txid}`);
            sub.isActive = false;
            self.storage.storeTxConfirmationSub(sub, function (err) {
                if (err) {
                    return cb(err);
                }

                const notification = Notification.create({
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
    }

    const explorer = self.explorers[network];
    if (!explorer) {
        return;
    }

    explorer.getTxidsInBlock(hash, function (err, txids) {
        if (err) {
            log.error(`Could not fetch txids from block ${  hash}`, err);
            return;
        }

        self.storage.fetchActiveTxConfirmationSubs(null, function (err, subs) {
            if (err) {
                return;
            }
            if (lodash.isEmpty(subs)) {
                return;
            }
            const indexedSubs = lodash.keyBy(subs, 'txid');
            const triggered = [];
            lodash.each(txids, function (txid) {
                if (indexedSubs[txid]) {
                    triggered.push(indexedSubs[txid]);
                }
            });
            processTriggeredSubs(triggered, function (err) {
                if (err) {
                    log.error('Could not process tx confirmations', err);
                }
                return;
            });
        });
    });
};

BlockchainMonitor.prototype._handleNewBlock = function (networkAlias, hash) {
    this._notifyNewBlock(networkAlias, hash);
    this._handleTxConfirmations(networkAlias, hash);
};

BlockchainMonitor.prototype._storeAndBroadcastNotification = function (notification, cb) {
    const self = this;

    self.storage.storeNotification(notification.walletId, notification, function () {
        self.messageBroker.send(notification);
        if (cb) {
            return cb();
        }
    });
};

module.exports = BlockchainMonitor;
