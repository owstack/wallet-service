

const owsCommon = require('@owstack/ows-common');
const async = require('async');
const log = require('npmlog');
const Model = require('./model');
const mongodb = require('mongodb');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

log.debug = log.verbose;
log.disableColor();

const collections = {
    WALLETS: 'wallets',
    TXS: 'txs',
    ADDRESSES: 'addresses',
    NOTIFICATIONS: 'notifications',
    COPAYERS_LOOKUP: 'copayers_lookup',
    PREFERENCES: 'preferences',
    EMAIL_QUEUE: 'email_queue',
    CACHE: 'cache',
    FIAT_RATES: 'fiat_rates',
    TX_NOTES: 'tx_notes',
    SESSIONS: 'sessions',
    PUSH_NOTIFICATION_SUBS: 'push_notification_subs',
    TX_CONFIRMATION_SUBS: 'tx_confirmation_subs',
};

class Storage {
    constructor(context, config, opts) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
        context.inject(this);

        opts = opts || {};
        opts.creator = opts.creator || 'unknown';

        this.config = config || {};
        this.opts = opts;

        // If a database object is provided then use it.
        if (this.opts.db) {
            Storage.db = this.opts.db;
        }
    }
}

Storage.db;

Storage.prototype._createIndexes = function () {
    Storage.db.collection(collections.WALLETS).createIndex({
        id: 1
    });
    Storage.db.collection(collections.COPAYERS_LOOKUP).createIndex({
        copayerId: 1
    });
    Storage.db.collection(collections.TXS).createIndex({
        walletId: 1,
        id: 1,
    });
    Storage.db.collection(collections.TXS).createIndex({
        walletId: 1,
        isPending: 1,
        txid: 1,
    });
    Storage.db.collection(collections.TXS).createIndex({
        walletId: 1,
        createdOn: -1,
    });
    Storage.db.collection(collections.NOTIFICATIONS).createIndex({
        walletId: 1,
        id: 1,
    });
    Storage.db.collection(collections.ADDRESSES).createIndex({
        walletId: 1,
        createdOn: 1,
    });
    Storage.db.collection(collections.ADDRESSES).createIndex({
        address: 1,
    });
    Storage.db.collection(collections.EMAIL_QUEUE).createIndex({
        notificationId: 1,
    });
    Storage.db.collection(collections.CACHE).createIndex({
        walletId: 1,
        type: 1,
        key: 1,
    });
    Storage.db.collection(collections.TX_NOTES).createIndex({
        walletId: 1,
        txid: 1,
    });
    Storage.db.collection(collections.PUSH_NOTIFICATION_SUBS).createIndex({
        copayerId: 1,
    });
    Storage.db.collection(collections.TX_CONFIRMATION_SUBS).createIndex({
        copayerId: 1,
        txid: 1,
    });
    Storage.db.collection(collections.SESSIONS).createIndex({
        copayerId: 1
    });
};

Storage.prototype.connect = function (cb) {
    const self = this;

    if (Storage.db) {
        return cb();
    }

    const config = self.config.mongoDb || {};
    mongodb.MongoClient.connect(config.uri, function (err, db) {
        if (err) {
            log.error(`Unable to connect to the mongoDB for ${  self.opts.creator  }. Check the credentials.`);
            return cb(err);
        }
        Storage.db = db;
        self._createIndexes();
        console.log(`Connection established to mongoDB for ${  self.opts.creator}`);
        return cb();
    });
};

Storage.prototype.disconnect = function (cb) {
    Storage.db.close(true, function (err) {
        if (err) {
            return cb(err);
        }
        Storage.db = null;
        return cb();
    });
};

Storage.prototype.getDB = function () {
    return Storage.db;
};

Storage.prototype.fetchWallet = function (id, cb) {
    const self = this;
    Storage.db.collection(collections.WALLETS).findOne({
        id: id
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        return cb(null, self.ctx.Wallet.fromObj(result));
    });
};

Storage.prototype.storeWallet = function (wallet, cb) {
    Storage.db.collection(collections.WALLETS).update({
        id: wallet.id
    }, wallet.toObject(), {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.storeWalletAndUpdateCopayersLookup = function (wallet, cb) {
    const self = this;

    const copayerLookups = lodash.map(wallet.copayers, function (copayer) {
        $.checkState(copayer.requestPubKeys);
        return {
            copayerId: copayer.id,
            walletId: wallet.id,
            requestPubKeys: copayer.requestPubKeys,
        };
    });

    Storage.db.collection(collections.COPAYERS_LOOKUP).remove({
        walletId: wallet.id
    }, {
        w: 1
    }, function (err) {
        if (err) {
            return cb(err);
        }
        Storage.db.collection(collections.COPAYERS_LOOKUP).insert(copayerLookups, {
            w: 1
        }, function (err) {
            if (err) {
                return cb(err);
            }
            return self.storeWallet(wallet, cb);
        });
    });
};

Storage.prototype.fetchCopayerLookup = function (copayerId, cb) {
    Storage.db.collection(collections.COPAYERS_LOOKUP).findOne({
        copayerId: copayerId
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }

        if (!result.requestPubKeys) {
            result.requestPubKeys = [{
                key: result.requestPubKey,
                signature: result.signature,
            }];
        }

        return cb(null, result);
    });
};

// TODO: should be done client-side
Storage.prototype._completeTxData = function (walletId, txs, cb) {
    const self = this;

    self.fetchWallet(walletId, function (err, wallet) {
        if (err) {
            return cb(err);
        }
        lodash.each([].concat(txs), function (tx) {
            tx.derivationStrategy = wallet.derivationStrategy || 'BIP45';
            tx.creatorName = wallet.getCopayer(tx.creatorId).name;
            lodash.each(tx.actions, function (action) {
                action.copayerName = wallet.getCopayer(action.copayerId).name;
            });

            if (tx.status == 'accepted') {
                tx.raw = tx.getRawTx();
            }

        });
        return cb(null, txs);
    });
};

// TODO: remove walletId from signature
Storage.prototype.fetchTx = function (walletId, txProposalId, cb) {
    const self = this;

    Storage.db.collection(collections.TXS).findOne({
        id: txProposalId,
        walletId: walletId
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }

        return self._completeTxData(walletId, self.ctx.TxProposal.fromObj(result), cb);
    });
};

Storage.prototype.fetchTxByHash = function (hash, cb) {
    const self = this;

    Storage.db.collection(collections.TXS).findOne({
        txid: hash,
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }

        return self._completeTxData(result.walletId, self.ctx.TxProposal.fromObj(result), cb);
    });
};

Storage.prototype.fetchLastTxs = function (walletId, creatorId, limit, cb) {
    const self = this;

    Storage.db.collection(collections.TXS).find({
        walletId: walletId,
        creatorId: creatorId,
    }, {
        limit: limit || 5
    }).sort({
        createdOn: -1
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        const txs = lodash.map(result, function (tx) {
            return self.ctx.TxProposal.fromObj(tx);
        });
        return cb(null, txs);
    });
};

Storage.prototype.fetchPendingTxs = function (walletId, cb) {
    const self = this;

    Storage.db.collection(collections.TXS).find({
        walletId: walletId,
        isPending: true,
    }).sort({
        createdOn: -1
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        const txs = lodash.map(result, function (tx) {
            return self.ctx.TxProposal.fromObj(tx);
        });
        return self._completeTxData(walletId, txs, cb);
    });
};

/**
 * fetchTxs. Times are in UNIX EPOCH (seconds)
 *
 * @param walletId
 * @param opts.minTs
 * @param opts.maxTs
 * @param opts.limit
 */
Storage.prototype.fetchTxs = function (walletId, opts, cb) {
    const self = this;

    opts = opts || {};

    const tsFilter = {};
    if (!opts.minTs) {
        opts.minTs = 0;
    }
    if (!opts.maxTs) {
        opts.maxTs = Date.now();
    }

    if (lodash.isNumber(opts.minTs)) {
        tsFilter.$gte = opts.minTs;
    }
    if (lodash.isNumber(opts.maxTs)) {
        tsFilter.$lte = opts.maxTs;
    }

    const filter = {
        walletId: walletId
    };
    if (!lodash.isEmpty(tsFilter)) {
        filter.createdOn = tsFilter;
    }

    const mods = {};
    if (lodash.isNumber(opts.limit)) {
        mods.limit = opts.limit;
    }

    Storage.db.collection(collections.TXS).find(filter, mods).sort({
        createdOn: -1
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        const txs = lodash.map(result, function (tx) {
            return self.ctx.TxProposal.fromObj(tx);
        });
        return self._completeTxData(walletId, txs, cb);
    });
};

/**
 * fetchBroadcastedTxs. Times are in UNIX EPOCH (seconds)
 *
 * @param walletId
 * @param opts.minTs
 * @param opts.maxTs
 * @param opts.limit
 */
Storage.prototype.fetchBroadcastedTxs = function (walletId, opts, cb) {
    const self = this;

    opts = opts || {};

    const tsFilter = {};
    if (lodash.isNumber(opts.minTs)) {
        tsFilter.$gte = opts.minTs;
    }
    if (lodash.isNumber(opts.maxTs)) {
        tsFilter.$lte = opts.maxTs;
    }

    const filter = {
        walletId: walletId,
        status: 'broadcasted',
    };
    if (!lodash.isEmpty(tsFilter)) {
        filter.broadcastedOn = tsFilter;
    }

    const mods = {};
    if (lodash.isNumber(opts.limit)) {
        mods.limit = opts.limit;
    }

    Storage.db.collection(collections.TXS).find(filter, mods).sort({
        createdOn: -1
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        const txs = lodash.map(result, function (tx) {
            return self.ctx.TxProposal.fromObj(tx);
        });
        return self._completeTxData(walletId, txs, cb);
    });
};

/**
 * Retrieves notifications after a specific id or from a given ts (whichever is more recent).
 *
 * @param {String} notificationId
 * @param {Number} minTs
 * @returns {Notification[]} Notifications
 */
Storage.prototype.fetchNotifications = function (walletId, notificationId, minTs, cb) {
    const self = this;

    function makeId(timestamp) {
        return lodash.padStart(timestamp, 14, '0') + lodash.repeat('0', 4);
    }

    let minId = makeId(minTs);
    if (notificationId) {
        minId = notificationId > minId ? notificationId : minId;
    }

    Storage.db.collection(collections.NOTIFICATIONS)
        .find({
            walletId: walletId,
            id: {
                $gt: minId,
            },
        })
        .sort({
            id: 1
        })
        .toArray(function (err, result) {
            if (err) {
                return cb(err);
            }
            if (!result) {
                return cb();
            }
            const notifications = lodash.map(result, function (notification) {
                return Model.Notification.fromObj(notification);
            });
            return cb(null, notifications);
        });
};

// TODO: remove walletId from signature
Storage.prototype.storeNotification = function (walletId, notification, cb) {
    Storage.db.collection(collections.NOTIFICATIONS).insert(notification, {
        w: 1
    }, cb);
};

// TODO: remove walletId from signature
Storage.prototype.storeTx = function (walletId, txp, cb) {
    Storage.db.collection(collections.TXS).update({
        id: txp.id,
        walletId: walletId
    }, txp.toObject(), {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.removeTx = function (walletId, txProposalId, cb) {
    Storage.db.collection(collections.TXS).findAndRemove({
        id: txProposalId,
        walletId: walletId
    }, {
        w: 1
    }, cb);
};

Storage.prototype.removeWallet = function (walletId, cb) {
    async.parallel([
        function (next) {
            Storage.db.collection(collections.WALLETS).findAndRemove({
                id: walletId
            }, next);
        },
        function (next) {
            const otherCollections = lodash.without(lodash.values(collections), collections.WALLETS);
            async.each(otherCollections, function (col, next) {
                Storage.db.collection(col).remove({
                    walletId: walletId
                }, next);
            }, next);
        },
    ], cb);
};

Storage.prototype.fetchAddresses = function (walletId, cb) {
    const self = this;

    Storage.db.collection(collections.ADDRESSES).find({
        walletId: walletId,
    }).sort({
        createdOn: 1
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        const addresses = lodash.map(result, function (address) {
            return self.ctx.Address.fromObj(address);
        });
        return cb(null, addresses);
    });
};

Storage.prototype.countAddresses = function (walletId, cb) {
    Storage.db.collection(collections.ADDRESSES).find({
        walletId: walletId,
    }).count(cb);
};

Storage.prototype.storeAddress = function (address, cb) {
    Storage.db.collection(collections.ADDRESSES).update({
        address: address.address
    }, address, {
        w: 1,
        upsert: false,
    }, cb);
};

Storage.prototype.storeAddressAndWallet = function (wallet, addresses, cb) {
    const self = this;

    function saveAddresses(addresses, cb) {
        if (lodash.isEmpty(addresses)) {
            return cb();
        }

        const addrs = lodash.map(addresses, function (address) {
            return (address.toObject ? address.toObject() : address);
        });

        Storage.db.collection(collections.ADDRESSES).insert(addrs, {
            w: 1
        }, cb);
    }

    addresses = [].concat(addresses);
    if (addresses.length == 0) {
        return cb();
    }

    async.filter(addresses, function (address, next) {
        Storage.db.collection(collections.ADDRESSES).findOne({
            address: address.address,
        }, {
            walletId: true,
        }, function (err, result) {
            if (err || !result) {
                return next(true);
            }
            if (result.walletId != wallet.id) {
                log.warn(`Address ${  address.address  } exists in more than one wallet.`);
                return next(true);
            }
            // Ignore if address was already in wallet
            return next(false);
        });
    }, function (newAddresses) {
        if (newAddresses.length < addresses.length) {
            log.warn(`Attempted to store already existing addresses on wallet ${  wallet.id}`);
        }
        saveAddresses(newAddresses, function (err) {
            if (err) {
                return cb(err);
            }
            self.storeWallet(wallet, cb);
        });
    });
};

Storage.prototype.fetchAddress = function (address, cb) {
    const self = this;

    Storage.db.collection(collections.ADDRESSES).findOne({
        address: address,
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }

        return cb(null, self.ctx.Address.fromObj(result));
    });
};

Storage.prototype.fetchPreferences = function (walletId, copayerId, cb) {
    Storage.db.collection(collections.PREFERENCES).find({
        walletId: walletId,
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }

        if (copayerId) {
            result = lodash.find(result, {
                copayerId: copayerId
            });
        }
        if (!result) {
            return cb();
        }

        let preferences = lodash.map([].concat(result), function (r) {
            return Model.Preferences.fromObj(r);
        });
        if (copayerId) {
            preferences = preferences[0];
        }
        return cb(null, preferences);
    });
};

Storage.prototype.storePreferences = function (preferences, cb) {
    Storage.db.collection(collections.PREFERENCES).update({
        walletId: preferences.walletId,
        copayerId: preferences.copayerId,
    }, preferences, {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.storeEmail = function (email, cb) {
    Storage.db.collection(collections.EMAIL_QUEUE).update({
        id: email.id,
    }, email, {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.fetchUnsentEmails = function (cb) {
    Storage.db.collection(collections.EMAIL_QUEUE).find({
        status: 'pending',
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result || lodash.isEmpty(result)) {
            return cb(null, []);
        }
        return cb(null, Model.Email.fromObj(result));
    });
};

Storage.prototype.fetchEmailByNotification = function (notificationId, cb) {
    Storage.db.collection(collections.EMAIL_QUEUE).findOne({
        notificationId: notificationId,
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }

        return cb(null, Model.Email.fromObj(result));
    });
};

Storage.prototype.cleanActiveAddresses = function (walletId, cb) {
    async.series([
        function (next) {
            Storage.db.collection(collections.CACHE).remove({
                walletId: walletId,
                type: 'activeAddresses',
            }, {
                w: 1
            }, next);
        },
        function (next) {
            Storage.db.collection(collections.CACHE).insert({
                walletId: walletId,
                type: 'activeAddresses',
                key: null
            }, {
                w: 1
            }, next);
        },
    ], cb);
};

Storage.prototype.storeActiveAddresses = function (walletId, addresses, cb) {
    async.each(addresses, function (address, next) {
        const record = {
            walletId: walletId,
            type: 'activeAddresses',
            key: address,
        };
        Storage.db.collection(collections.CACHE).update({
            walletId: record.walletId,
            type: record.type,
            key: record.key,
        }, record, {
            w: 1,
            upsert: true,
        }, next);
    }, cb);
};

// --------         ---------------------------  Total
//           > Time >
//                       ^to     <=  ^from
//                       ^fwdIndex  =>  ^end
Storage.prototype.getTxHistoryCache = function (walletId, from, to, cb) {
    $.checkArgument(from >= 0);
    $.checkArgument(from <= to);

    Storage.db.collection(collections.CACHE).findOne({
        walletId: walletId,
        type: 'historyCacheStatus',
        key: null
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        if (!result.isUpdated) {
            return cb();
        }

        // Reverse indexes
        let fwdIndex = result.totalItems - to;

        if (fwdIndex < 0) {
            fwdIndex = 0;
        }

        const end = result.totalItems - from;

        // nothing to return
        if (end <= 0) {
            return cb(null, []);
        }

        // Cache is OK.
        Storage.db.collection(collections.CACHE).find({
            walletId: walletId,
            type: 'historyCache',
            key: {
                $gte: fwdIndex,
                $lt: end
            },
        }).sort({
            key: -1,
        }).toArray(function (err, result) {
            if (err) {
                return cb(err);
            }

            if (!result) {
                return cb();
            }

            if (result.length < end - fwdIndex) {
                // some items are not yet defined.
                return cb();
            }

            const txs = lodash.map(result, 'tx');
            return cb(null, txs);
        });
    });
};

Storage.prototype.softResetAllTxHistoryCache = function (cb) {
    Storage.db.collection(collections.CACHE).update({
        type: 'historyCacheStatus',
    }, {
        isUpdated: false,
    }, {
        multi: true,
    }, cb);
};

Storage.prototype.softResetTxHistoryCache = function (walletId, cb) {
    Storage.db.collection(collections.CACHE).update({
        walletId: walletId,
        type: 'historyCacheStatus',
        key: null
    }, {
        isUpdated: false,
    }, {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.clearTxHistoryCache = function (walletId, cb) {
    Storage.db.collection(collections.CACHE).remove({
        walletId: walletId,
        type: 'historyCache',
    }, {
        multi: 1
    }, function (err) {
        if (err) {
            return cb(err);
        }
        Storage.db.collection(collections.CACHE).remove({
            walletId: walletId,
            type: 'historyCacheStatus',
            key: null
        }, {
            w: 1
        }, cb);
    });
};

// items should be in CHRONOLOGICAL order
Storage.prototype.storeTxHistoryCache = function (walletId, totalItems, firstPosition, items, cb) {
    $.shouldBeNumber(firstPosition);
    $.checkArgument(firstPosition >= 0);
    $.shouldBeNumber(totalItems);
    $.checkArgument(totalItems >= 0);

    lodash.each(items, function (item, i) {
        item.position = firstPosition + i;
    });
    const cacheIsComplete = (firstPosition == 0);

    // TODO: check txid uniqness?
    async.each(items, function (item, next) {
        const pos = item.position;
        delete item.position;
        Storage.db.collection(collections.CACHE).update({
            walletId: walletId,
            type: 'historyCache',
            key: pos,
        }, {
            walletId: walletId,
            type: 'historyCache',
            key: pos,
            tx: item,
        }, {
            w: 1,
            upsert: true,
        }, next);
    }, function (err) {
        if (err) {
            return cb(err);
        }

        Storage.db.collection(collections.CACHE).update({
            walletId: walletId,
            type: 'historyCacheStatus',
            key: null
        }, {
            walletId: walletId,
            type: 'historyCacheStatus',
            key: null,
            totalItems: totalItems,
            updatedOn: Date.now(),
            isComplete: cacheIsComplete,
            isUpdated: true,
        }, {
            w: 1,
            upsert: true,
        }, cb);
    });
};

Storage.prototype.fetchActiveAddresses = function (walletId, cb) {
    Storage.db.collection(collections.CACHE).find({
        walletId: walletId,
        type: 'activeAddresses',
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        if (lodash.isEmpty(result)) {
            return cb();
        }

        return cb(null, lodash.compact(lodash.map(result, 'key')));
    });
};

Storage.prototype.storeFiatRate = function (providerName, rates, cb) {
    const now = Date.now();
    async.each(rates, function (rate, next) {
        Storage.db.collection(collections.FIAT_RATES).insert({
            provider: providerName,
            ts: now,
            code: rate.code,
            value: rate.value,
        }, {
            w: 1
        }, next);
    }, cb);
};

Storage.prototype.fetchFiatRate = function (providerName, code, ts, cb) {
    Storage.db.collection(collections.FIAT_RATES).find({
        provider: providerName,
        code: code,
        ts: {
            $lte: ts
        },
    }).sort({
        ts: -1
    }).limit(1).toArray(function (err, result) {
        if (err || lodash.isEmpty(result)) {
            return cb(err);
        }
        return cb(null, result[0]);
    });
};

Storage.prototype.fetchTxNote = function (walletId, txid, cb) {
    const self = this;

    Storage.db.collection(collections.TX_NOTES).findOne({
        walletId: walletId,
        txid: txid,
    }, function (err, result) {
        if (err) {
            return cb(err);
        }
        if (!result) {
            return cb();
        }
        return self._completeTxNotesData(walletId, Model.TxNote.fromObj(result), cb);
    });
};

// TODO: should be done client-side
Storage.prototype._completeTxNotesData = function (walletId, notes, cb) {
    const self = this;

    self.fetchWallet(walletId, function (err, wallet) {
        if (err) {
            return cb(err);
        }
        lodash.each([].concat(notes), function (note) {
            note.editedByName = wallet.getCopayer(note.editedBy).name;
        });
        return cb(null, notes);
    });
};

/**
 * fetchTxNotes. Times are in UNIX EPOCH (seconds)
 *
 * @param walletId
 * @param opts.minTs
 */
Storage.prototype.fetchTxNotes = function (walletId, opts, cb) {
    const self = this;

    const filter = {
        walletId: walletId,
    };
    if (lodash.isNumber(opts.minTs)) {
        filter.editedOn = {
            $gte: opts.minTs
        };
    }
    Storage.db.collection(collections.TX_NOTES).find(filter).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }
        const notes = lodash.compact(lodash.map(result, function (note) {
            return Model.TxNote.fromObj(note);
        }));
        return self._completeTxNotesData(walletId, notes, cb);
    });
};

Storage.prototype.storeTxNote = function (txNote, cb) {
    Storage.db.collection(collections.TX_NOTES).update({
        txid: txNote.txid,
        walletId: txNote.walletId
    }, txNote.toObject(), {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.getSession = function (copayerId, cb) {
    const self = this;

    Storage.db.collection(collections.SESSIONS).findOne({
        copayerId: copayerId,
    },
    function (err, result) {
        if (err || !result) {
            return cb(err);
        }
        return cb(null, self.ctx.Session.fromObj(result));
    });
};

Storage.prototype.storeSession = function (session, cb) {
    Storage.db.collection(collections.SESSIONS).update({
        copayerId: session.copayerId,
    }, session.toObject(), {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.fetchPushNotificationSubs = function (copayerId, cb) {
    Storage.db.collection(collections.PUSH_NOTIFICATION_SUBS).find({
        copayerId: copayerId,
    }).toArray(function (err, result) {
        if (err) {
            return cb(err);
        }

        if (!result) {
            return cb();
        }

        const tokens = lodash.map([].concat(result), function (r) {
            return Model.PushNotificationSub.fromObj(r);
        });
        return cb(null, tokens);
    });
};

Storage.prototype.storePushNotificationSub = function (pushNotificationSub, cb) {
    Storage.db.collection(collections.PUSH_NOTIFICATION_SUBS).update({
        copayerId: pushNotificationSub.copayerId,
        token: pushNotificationSub.token,
    }, pushNotificationSub, {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.removePushNotificationSub = function (copayerId, token, cb) {
    Storage.db.collection(collections.PUSH_NOTIFICATION_SUBS).remove({
        copayerId: copayerId,
        token: token,
    }, {
        w: 1
    }, cb);
};

Storage.prototype.fetchActiveTxConfirmationSubs = function (copayerId, cb) {
    const filter = {
        isActive: true
    };
    if (copayerId) {
        filter.copayerId = copayerId;
    }

    Storage.db.collection(collections.TX_CONFIRMATION_SUBS).find(filter)
        .toArray(function (err, result) {
            if (err) {
                return cb(err);
            }

            if (!result) {
                return cb();
            }

            const subs = lodash.map([].concat(result), function (r) {
                return Model.TxConfirmationSub.fromObj(r);
            });
            return cb(null, subs);
        });
};

Storage.prototype.storeTxConfirmationSub = function (txConfirmationSub, cb) {
    Storage.db.collection(collections.TX_CONFIRMATION_SUBS).update({
        copayerId: txConfirmationSub.copayerId,
        txid: txConfirmationSub.txid,
    }, txConfirmationSub, {
        w: 1,
        upsert: true,
    }, cb);
};

Storage.prototype.removeTxConfirmationSub = function (copayerId, txid, cb) {
    Storage.db.collection(collections.TX_CONFIRMATION_SUBS).remove({
        copayerId: copayerId,
        txid: txid,
    }, {
        w: 1
    }, cb);
};

Storage.prototype._dump = function (cb, fn) {
    fn = fn || console.log;
    cb = cb || function () {};

    Storage.db.collections(function (err, collections) {
        if (err) {
            return cb(err);
        }
        async.eachSeries(collections, function (col, next) {
            col.find().toArray(function (err, items) {
                fn('--------', col.s.name);
                fn(items);
                fn('------------------------------------------------------------------\n\n');
                next(err);
            });
        }, cb);
    });
};

Storage.collections = collections;
module.exports = Storage;
