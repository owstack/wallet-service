'use strict';

var owsCommon = require('@owstack/ows-common');
var keyLib = require('@owstack/key-lib');
var async = require('async');
var baseConfig = require('../../config');
var ClientError = require('./errors/clienterror');
var Common = require('./common');
var Constants = owsCommon.Constants;
var EmailValidator = require('email-validator');
var errors = owsCommon.errors;
var Errors = require('./errors/errordefinitions');
var FiatRateService = require('./fiatrateservice');
var HDPublicKey = keyLib.HDPublicKey;
var Lock = require('./lock');
var log = require('npmlog');
var MessageBroker = require('./messagebroker');
var Model = require('./model');
var pkg = require('../../package');
var PublicKey = keyLib.PublicKey;
var request = require('request');
var Stringify = require('json-stable-stringify');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;
log.disableColor();

var serviceVersion;

/**
 * Static services shared among all instances of this WalletService.
 */
var lock;
var fiatRateService;
var messageBroker;

/**
 * Creates an instance of the Wallet Service.
 * @constructor
 */
function WalletService(context, opts, config, cb) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.code;
  this.TESTNET = this.ctx.Networks.testnet.code;
  this.COIN = this.ctx.Networks.coin;

  this.atomicsName = this.ctx.Unit().atomicsName();
  this.utils = new this.ctx.Utils();

  this.initialize(opts, config, cb);
};

WalletService.prototype.checkRequired = function(obj, args, cb) {
  var missing = this.ctx.Utils.getMissingFields(obj, args);
  if (lodash.isEmpty(missing)) {
    return true;
  }
  if (lodash.isFunction(cb)) {
    cb(new ClientError('Required argument ' + lodash.head(missing) + ' missing.'));
  }
  return false;
};

/**
 * Gets the current version of this wallet service.
 */
WalletService.getServiceVersion = function() {
  if (!serviceVersion) {
    serviceVersion = 'ws-' + pkg.version;
  }
  return serviceVersion;
};

/**
 * Initializes this instance.
 * @param {Object} opts - Options, most used for testing.
 * @param {Storage} [opts.storage] - A Storage instance.
 * @param {BlockchainExplorer} [opts.blockchainExplorer] - A BlockchainExporer instance.
 * @param {BlockchainMonitor} [opts.blockchainMonitor] - A BlockchainMonitor instance.
 * @param {MessageBroker} [opts.messageBroker] - A MessageBroker instance.
 * @param {Object} [opts.request] - A (http) request object.
 * @param {String} [opts.clientVersion] - A string that identifies the client issuing the request.
 * @param {Object} config - a server configuration
 * @param {Callback} cb
 */
WalletService.prototype.initialize = function(opts, config, cb) {
  var self = this;
  $.shouldBeFunction(cb);

  opts = opts || {};
  self.config = config || baseConfig;
  self.notifyTicker = 0;
  self._setClientVersion(opts.clientVersion);

  if (opts.request) {
    request = opts.request;
  }

  function initStorage(cb) {
    if (!self.storage) {
      if (opts.storage) {
        self.storage = opts.storage;
        return cb();
      } else {
        var newStorage = new self.ctx.Storage();
        newStorage.connect(self.config.storageOpts, function(err) {
          if (err) {
            return cb(err);
          }
          self.storage = newStorage;
          return cb();
        });
      }
    }
    return cb();
  };

  function initBlockchainExplorer(cb) {
    // If a blockchain explorer was provided then set it.
    self.blockchainExplorer = opts.blockchainExplorer;
    return cb();
  };

  function initMessageBroker(cb) {
    if (!messageBroker) {
      messageBroker = opts.messageBroker || new MessageBroker(self.config.messageBrokerOpts);
      messageBroker.onMessage(lodash.bind(self.handleIncomingNotification, self));
    }
    return cb();
  };

  function initLock(cb) {
    if (!lock) {
      lock = config.lock || new Lock(config.lockOpts);
    }
    return cb();
  };

  function initFiatRateService(cb) {
    if (self.config.fiatRateService) {
      fiatRateService = self.config.fiatRateService;
      return cb();
    } else {
      var newFiatRateService = new FiatRateService(self.config);
      newFiatRateService.init({
        storage: self.storage
      } , function(err) {
        if (err) {
          return cb(err);
        }
        fiatRateService = newFiatRateService;
        return cb();
      });
    }
  };

  async.series([
    function(next) {
      initStorage(next);
    },
    function(next) {
      initBlockchainExplorer(next);
    },
    function(next) {
      initMessageBroker(next);
    },
    function(next) {
      initLock(next);
    },
    function(next) {
      initFiatRateService(next);
    }
  ], function(err) {
    if (err) {
      log.error('Could not initialize', err);
      throw err;
    }

    return cb(self);
  });
};

WalletService.prototype.handleIncomingNotification = function(notification, cb) {
  var self = this;
  cb = cb || function() {};

  if (!notification || notification.type != 'NewBlock' || !MessageBroker.isNotificationForMe(notification, self.COIN)) {
    return cb();
  }
  WalletService._clearBlockchainHeightCache(notification.data.network, notification.targetNetwork);
  return cb();
};


WalletService.prototype.shutDown = function(cb) {
  var self = this;

  if (messageBroker) {
    messageBroker.removeAllListeners();
    messageBroker = undefined;
  }

  if (self.storage) {
    self.storage.disconnect(function(err) {
      if (err) {
        return cb(err);
      }
      self.storage = undefined;
      return cb();
    });
  } else {
    return cb();
  }
};

/**
 * Gets an instance of the server without authentication.
 * @param {Object} opts - Options for the server
 * @param {Object} opts.blockchainExplorer - A blockchain explorer instance to attach
 * @param {Object} opts.storage - A storage instance to attach
 * @param {Object} config - Service configuration, see ../config.js
 */
WalletService.getInstance = function(opts, config) {
  throw 'Must override';
};

/**
 * Initialize an instance of the server after authenticating the copayer.
 * @param {Object} opts - Options for the server
 * @param {Object} opts.blockchainExplorer - A blockchain explorer instance to attach
 * @param {Object} opts.storage - A storage instance to attach
 * @param {string} opts.clientVersion - A string that identifies the client issuing the request
 * @param {Object} config - Service configuration, see ../config.js
 * @param {Object} auth
 * @param {string} auth.copayerId - The copayer id making the request.
 * @param {string} auth.message - (Optional) The contents of the request to be signed. Only needed if no session token is provided.
 * @param {string} auth.signature - (Optional) Signature of message to be verified using one of the copayer's requestPubKeys. Only needed if no session token is provided.
 * @param {string} auth.session - (Optional) A valid session token previously obtained using the #login method
 * @param {string} [auth.walletId] - The wallet id to use as current wallet for this request (only when copayer is support staff).
 */
WalletService.getInstanceWithAuth = function(opts, config, auth, cb) {
  throw 'Must override';
};

WalletService.prototype.initInstanceWithAuth = function(auth, cb) {
  var self = this;

  if (auth.session) {
    if (!self.checkRequired(auth, ['copayerId', 'session'], cb)) {
      return;
    }
  } else {
    if (!self.checkRequired(auth, ['copayerId', 'message', 'signature'], cb)) {
      return;
    }
  }

  function withSignature(cb) {
    self.storage.fetchCopayerLookup(auth.copayerId, function(err, copayer) {
      if (err) {
        return cb(err);
      }
      if (!copayer) {
        return cb(new ClientError(Errors.codes.NOT_AUTHORIZED, 'Copayer not found'));
      }

      if (!copayer.isSupportStaff) {
        var isValid = !!self._getSigningKey(auth.message, auth.signature, copayer.requestPubKeys);
        if (!isValid) {
          return cb(new ClientError(Errors.codes.NOT_AUTHORIZED, 'Invalid signature'));
        }
        self.walletId = copayer.walletId;
      } else {
        self.walletId = auth.walletId || copayer.walletId;
        self.copayerIsSupportStaff = true;
      }

      self.copayerId = auth.copayerId;
      return cb(null, self);
    });
  };

  function withSession(cb) {
    self.storage.getSession(auth.copayerId, function(err, s) {
      if (err) {
        return cb(err);
      }

      var isValid = s && s.id == auth.session && s.isValid();
      if (!isValid) {
        return cb(new ClientError(Errors.codes.NOT_AUTHORIZED, 'Session expired'));
      }

      self.storage.fetchCopayerLookup(auth.copayerId, function(err, copayer) {
        if (err) {
          return cb(err);
        }
        if (!copayer) {
         return cb(new ClientError(Errors.codes.NOT_AUTHORIZED, 'Copayer not found'));
        }

        self.copayerId = auth.copayerId;
        self.walletId = copayer.walletId;
        return cb(null, self);
      });
    });
  };

  var authFn = auth.session ? withSession : withSignature;
  return authFn(cb);
};

WalletService.prototype._runLocked = function(cb, task) {
  $.checkState(this.walletId);
  lock.runLocked(this.walletId, cb, task);
};

WalletService.prototype.login = function(opts, cb) {
  var self = this;

  var session;
  async.series([

    function(next) {
      self.storage.getSession(self.copayerId, function(err, s) {
        if (err) {
          return next(err);
        }
        session = s;
        next();
      });
    },
    function(next) {
      if (!session || !session.isValid()) {
        session = new self.ctx.Session({
          copayerId: self.copayerId,
          walletId: self.walletId,
        });
      } else {
        session.touch();
      }
      next();
    },
    function(next) {
      self.storage.storeSession(session, next);
    },
  ], function(err) {
    if (err) {
      return cb(err);
    }
    if (!session) {
      return cb(new Error('Could not get current session for this copayer'));
    }

    return cb(null, session.id);
  });
};

WalletService.prototype.logout = function(opts, cb) {
  var self = this;

  self.storage.removeSession(self.copayerId, cb);
};

/**
 * Gets the storage for this instance of the server.
 */
WalletService.prototype.getStorage = function() {
  return this.storage;
};

/**
 * Gets the message broker for this instance of the server.
 */
WalletService.prototype.getMessageBroker = function() {
  return messageBroker;
};

/**
 * Creates a new wallet.
 * @param {Object} opts
 * @param {string} opts.id - The wallet id.
 * @param {string} opts.name - The wallet name.
 * @param {number} opts.m - Required copayers.
 * @param {number} opts.n - Total copayers.
 * @param {string} opts.pubKey - Public key to verify copayers joining have access to the wallet secret.
 * @param {string} opts.singleAddress[=false] - The wallet will only ever have one address.
 * @param {string} opts.network[=self.LIVENET] - The network for this wallet.
 * @param {string} opts.supportBIP44AndP2PKH[=true] - Client supports BIP44 & P2PKH for new wallets.
 */
WalletService.prototype.createWallet = function(opts, cb) {
  var self = this;
  var pubKey;

  if (!self.checkRequired(opts, ['name', 'm', 'n', 'pubKey'], cb)) {
    return;
  }

  if (lodash.isEmpty(opts.name)) {
    return cb(new ClientError('Invalid wallet name'));
  }
  if (!self.ctx.Wallet.verifyCopayerLimits(opts.m, opts.n)) {
    return cb(new ClientError('Invalid combination of required copayers / total copayers'));
  }

  opts.network = opts.network || self.LIVENET;
  if (!lodash.includes([self.LIVENET, self.TESTNET], opts.network)) {
    return cb(new ClientError('Invalid network'));
  }

  opts.supportBIP44AndP2PKH = lodash.isBoolean(opts.supportBIP44AndP2PKH) ? opts.supportBIP44AndP2PKH : true;

  var derivationStrategy = opts.supportBIP44AndP2PKH ? Constants.DERIVATION_STRATEGIES.BIP44 : Constants.DERIVATION_STRATEGIES.BIP45;
  var addressType = (opts.n == 1 && opts.supportBIP44AndP2PKH) ? Constants.SCRIPT_TYPES.P2PKH : Constants.SCRIPT_TYPES.P2SH;

  try {
    pubKey = new PublicKey.fromString(opts.pubKey);
  } catch (ex) {
    return cb(new ClientError('Invalid public key'));
  };

  var newWallet;
  async.series([
    function(acb) {
      if (!opts.id) {
        return acb();
      }

      self.storage.fetchWallet(opts.id, function(err, wallet) {
        if (wallet) {
          return acb(Errors.WALLET_ALREADY_EXISTS);
        }
        return acb(err);
      });
    },
    function(acb) {
      var wallet = self.ctx.Wallet.create({
        id: opts.id,
        name: opts.name,
        m: opts.m,
        n: opts.n,
        network: opts.network,
        pubKey: pubKey.toString(),
        singleAddress: !!opts.singleAddress,
        derivationStrategy: derivationStrategy,
        addressType: addressType,
      });

      self.storage.storeWallet(wallet, function(err) {
        log.debug('Wallet created', wallet.id, opts.network);
        newWallet = wallet;
        return acb(err);
      });
    }
  ], function(err) {
    return cb(err, newWallet ? newWallet.id : null);
  });
};

/**
 * Retrieves a wallet from storage.
 * @param {Object} opts
 * @returns {Object} wallet
 */
WalletService.prototype.getWallet = function(opts, cb) {
  var self = this;
  self.storage.fetchWallet(self.walletId, function(err, wallet) {
    if (err) {
      return cb(err);
    }
    if (!wallet) {
      return cb(Errors.WALLET_NOT_FOUND);
    }
    return cb(null, wallet);
  });
};

/**
 * Retrieves a wallet from storage.
 * @param {Object} opts
 * @param {string} opts.identifier - The identifier associated with the wallet (one of: walletId, address, txid).
 * @returns {Object} wallet
 */
WalletService.prototype.getWalletFromIdentifier = function(opts, cb) {
  var self = this;

  if (!opts.identifier) {
    return cb();
  }

  var walletId;
  async.parallel([

    function(done) {
      self.storage.fetchWallet(opts.identifier, function(err, wallet) {
        if (wallet) {
          walletId = wallet.id;
        }
        return done(err);
      });
    },
    function(done) {
      self.storage.fetchAddress(opts.identifier, function(err, address) {
        if (address) {
          walletId = address.walletId;
        }
        return done(err);
      });
    },
    function(done) {
      self.storage.fetchTxByHash(opts.identifier, function(err, tx) {
        if (tx) {
          walletId = tx.walletId;
        }
        return done(err);
      });
    },
  ], function(err) {
    if (err) {
      return cb(err);
    }
    if (walletId) {
      return self.storage.fetchWallet(walletId, cb);
    }

    var re = /^[\da-f]+$/gi;
    if (!re.test(opts.identifier)) {
      return cb();
    }

    // Is identifier a txid form an incomming tx?
    async.detectSeries(lodash.values([self.LIVENET, self.TESTNET]), function(network, nextNetwork) {
      var bc = self._getBlockchainExplorer(network);
      if (!bc) {
        return nextNetwork(false);
      }
      bc.getTransaction(opts.identifier, function(err, tx) {
        if (err || !tx) {
          return nextNetwork(false);
        }
        var outputs = lodash.head(self._normalizeTxHistory(tx)).outputs;
        var toAddresses = lodash.map(outputs, 'address');
        async.detect(toAddresses, function(addressStr, nextAddress) {
          self.storage.fetchAddress(addressStr, function(err, address) {
            if (err || !address) {
              return nextAddress(false);
            }
            walletId = address.walletId;
            nextAddress(true);
          });
        }, function() {
          nextNetwork(!!walletId);
        });
      });
    }, function() {
      if (!walletId) {
        return cb();
      }
      return self.storage.fetchWallet(walletId, cb);
    });
  });
};

/**
 * Retrieves wallet status.
 * @param {Object} opts
 * @param {Object} opts.twoStep[=false] - Optional: use 2-step balance computation for improved performance
 * @param {Object} opts.includeExtendedInfo - Include PKR info & address managers for wallet & copayers
 * @returns {Object} status
 */
WalletService.prototype.getStatus = function(opts, cb) {
  var self = this;

  opts = opts || {};

  var status = {};
  async.parallel([

    function(next) {
      self.getWallet({}, function(err, wallet) {
        if (err) {
          return next(err);
        }

        var walletExtendedKeys = ['publicKeyRing', 'pubKey', 'addressManager'];
        var copayerExtendedKeys = ['xPubKey', 'requestPubKey', 'signature', 'addressManager', 'customData'];

        wallet.copayers = lodash.map(wallet.copayers, function(copayer) {
          if (copayer.id == self.copayerId) {
            return copayer;
          }
          return lodash.omit(copayer, 'customData');
        });
        if (!opts.includeExtendedInfo) {
          wallet = lodash.omit(wallet, walletExtendedKeys);
          wallet.copayers = lodash.map(wallet.copayers, function(copayer) {
            return lodash.omit(copayer, copayerExtendedKeys);
          });
        }
        status.wallet = wallet;
        next();
      });
    },
    function(next) {
      self.getBalance(opts, function(err, balance) {
        if (err) {
          return next(err);
        }
        status.balance = balance;
        next();
      });
    },
    function(next) {
      self.getPendingTxs({}, function(err, pendingTxps) {
        if (err) {
          return next(err);
        }
        status.pendingTxps = pendingTxps;
        next();
      });
    },
    function(next) {
      self.getPreferences({}, function(err, preferences) {
        if (err) {
          return next(err);
        }
        status.preferences = preferences;
        next();
      });
    },
  ], function(err) {
    if (err) {
      return cb(err);
    }
    return cb(null, status);
  });
};

/**
 * Verifies a signature
 * @param text
 * @param signature
 * @param pubKeys
 */
WalletService.prototype._verifySignature = function(text, signature, pubkey) {
  return this.ctx.Utils.verifyMessage(text, signature, pubkey);
};

/**
 * Verifies a request public key
 * @param requestPubKey
 * @param signature
 * @param xPubKey
 */
WalletService.prototype._verifyRequestPubKey = function(requestPubKey, signature, xPubKey) {
  var pub = (new HDPublicKey(xPubKey)).deriveChild(Constants.PATHS.REQUEST_KEY_AUTH).publicKey;
  return this.ctx.Utils.verifyMessage(requestPubKey, signature, pub.toString());
};

/**
 * Verifies signature againt a collection of pubkeys
 * @param text
 * @param signature
 * @param pubKeys
 */
WalletService.prototype._getSigningKey = function(text, signature, pubKeys) {
  var self = this;
  return lodash.find(pubKeys, function(item) {
    return self._verifySignature(text, signature, item.key);
  });
};

/**
 * _notify
 *
 * @param {String} type
 * @param {Object} data
 * @param {Object} opts
 * @param {Boolean} opts.isGlobal - If true, the notification is not issued on behalf of any particular copayer (defaults to false)
 */
WalletService.prototype._notify = function(type, data, opts, cb) {
  var self = this;

  if (lodash.isFunction(opts)) {
    cb = opts;
    opts = {};
  }
  opts = opts || {};

  log.debug('Notification', type, data);

  cb = cb || function() {};

  var walletId = self.walletId || data.walletId;
  var copayerId = self.copayerId || data.copayerId;

  $.checkState(walletId);

  var notification = Model.Notification.create({
    type: type,
    data: data,
    ticker: self.notifyTicker++,
    creatorId: opts.isGlobal ? null : copayerId,
    walletId: walletId,
    targetNetwork: {
      coin: self.COIN,
      defaultUnit: self.ctx.Unit().standardsName(),
      livenet: self.LIVENET,
      testnet: self.TESTNET
    }
  });

  self.storage.storeNotification(walletId, notification, function(err) {
    messageBroker.send(notification);
    return cb();
  });
};

WalletService.prototype._notifyTxProposalAction = function(type, txp, extraArgs, cb) {
  var self = this;

  if (lodash.isFunction(extraArgs)) {
    cb = extraArgs;
    extraArgs = {};
  }

  var data = lodash.assign({
    txProposalId: txp.id,
    creatorId: txp.creatorId,
    amount: txp.getTotalAmount(),
    message: txp.message,
  }, extraArgs);

  self._notify(type, data, {}, cb);
};

WalletService.prototype._addCopayerToWallet = function(wallet, opts, cb) {
  var self = this;

  var copayer = self.ctx.Copayer.create({
    name: opts.name,
    copayerIndex: wallet.copayers.length,
    xPubKey: opts.xPubKey,
    requestPubKey: opts.requestPubKey,
    signature: opts.copayerSignature,
    customData: opts.customData,
    derivationStrategy: wallet.derivationStrategy,
  });

  self.storage.fetchCopayerLookup(copayer.id, function(err, res) {
    if (err) {
      return cb(err);
    }
    if (res) {
      return cb(Errors.COPAYER_REGISTERED);
    }

    if (opts.dryRun) {
      return cb(null, {
        copayerId: null,
        wallet: wallet
      });
    }

    wallet.addCopayer(copayer);
    self.storage.storeWalletAndUpdateCopayersLookup(wallet, function(err) {
      if (err) {
        return cb(err);
      }

      async.series([
        function(next) {
          self._notify('NewCopayer', {
            walletId: opts.walletId,
            copayerId: copayer.id,
            copayerName: copayer.name,
          }, next);
        },
        function(next) {
          if (wallet.isComplete() && wallet.isShared()) {
            self._notify('WalletComplete', {
              walletId: opts.walletId,
            }, {
              isGlobal: true
            }, next);
          } else {
            next();
          }
        },
      ], function() {
        return cb(null, {
          copayerId: copayer.id,
          wallet: wallet
        });
      });
    });
  });
};

WalletService.prototype._addKeyToCopayer = function(wallet, copayer, opts, cb) {
  var self = this;
  wallet.addCopayerRequestKey(copayer.copayerId, opts.requestPubKey, opts.signature, opts.restrictions, opts.name);
  self.storage.storeWalletAndUpdateCopayersLookup(wallet, function(err) {
    if (err) {
      return cb(err);
    }

    return cb(null, {
      copayerId: copayer.id,
      wallet: wallet
    });
  });
};

/**
 * Adds access to a given copayer
 *
 * @param {Object} opts
 * @param {string} opts.copayerId - The copayer id
 * @param {string} opts.requestPubKey - Public Key used to check requests from this copayer.
 * @param {string} opts.copayerSignature - S(requestPubKey). Used by other copayers to verify the that the copayer is himself (signed with REQUEST_KEY_AUTH)
 * @param {string} opts.restrictions
 *    - cannotProposeTXs
 *    - cannotXXX TODO
 * @param {string} opts.name  (name for the new access)
 */
WalletService.prototype.addAccess = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['copayerId', 'requestPubKey', 'signature'], cb)) {
    return;
  }

  self.storage.fetchCopayerLookup(opts.copayerId, function(err, copayer) {
    if (err) {
      return cb(err);
    }
    if (!copayer) {
      return cb(Errors.NOT_AUTHORIZED);
    }
    self.storage.fetchWallet(copayer.walletId, function(err, wallet) {
      if (err) {
        return cb(err);
      }
      if (!wallet) {
        return cb(Errors.NOT_AUTHORIZED);
      }

      var xPubKey = lodash.find(wallet.copayers, {
        id: opts.copayerId
      }).xPubKey;

      if (!self._verifyRequestPubKey(opts.requestPubKey, opts.signature, xPubKey)) {
        return cb(Errors.NOT_AUTHORIZED);
      }

      if (copayer.requestPubKeys.length > self.ctx.Defaults.MAX_KEYS) {
        return cb(Errors.TOO_MANY_KEYS);
      }

      self._addKeyToCopayer(wallet, copayer, opts, cb);
    });
  });
};

WalletService.prototype.getClientVersion = function(version) {
  return this.clientVersion;
};

WalletService.prototype._setClientVersion = function(version) {
  delete this.parsedClientVersion;
  this.clientVersion = version;
};

WalletService.prototype._parseClientVersion = function() {
  if (lodash.isUndefined(this.parsedClientVersion)) {
    this.parsedClientVersion = this.ctx.Utils.parseVersion(this.clientVersion);
  }
  return this.parsedClientVersion;
};

WalletService.prototype._clientSupportsPayProRefund = function() {
  var version = this._parseClientVersion();
  if (!version) {
    return false;
  }
  if (version.agent != 'bwc') {
    return true;
  }
  if (version.major < 1 || (version.major == 1 && version.minor < 2)) {
    return false;
  }
  return true;
};

WalletService._getCopayerHash = function(name, xPubKey, requestPubKey) {
  return [name, xPubKey, requestPubKey].join('|');
};

/**
 * Joins a wallet in creation.
 * @param {Object} opts
 * @param {string} opts.walletId - The wallet id.
 * @param {string} opts.name - The copayer name.
 * @param {string} opts.xPubKey - Extended Public Key for this copayer.
 * @param {string} opts.requestPubKey - Public Key used to check requests from this copayer.
 * @param {string} opts.copayerSignature - S(name|xPubKey|requestPubKey). Used by other copayers to verify that the copayer joining knows the wallet secret.
 * @param {string} opts.customData - (optional) Custom data for this copayer.
 * @param {string} opts.dryRun[=false] - (optional) Simulate the action but do not change server state.
 * @param {string} [opts.supportBIP44AndP2PKH = true] - Client supports BIP44 & P2PKH for joining wallets.
 */
WalletService.prototype.joinWallet = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['walletId', 'name', 'xPubKey', 'requestPubKey', 'copayerSignature'], cb)) {
    return;
  }

  if (lodash.isEmpty(opts.name)) {
    return cb(new ClientError('Invalid copayer name'));
  }

  try {
    HDPublicKey(opts.xPubKey);
  } catch (ex) {
    return cb(new ClientError('Invalid extended public key'));
  }

  opts.supportBIP44AndP2PKH = lodash.isBoolean(opts.supportBIP44AndP2PKH) ? opts.supportBIP44AndP2PKH : true;

  self.walletId = opts.walletId;

  self._runLocked(cb, function(cb) {
    self.storage.fetchWallet(opts.walletId, function(err, wallet) {
      if (err) {
        return cb(err);
      }
      if (!wallet) {
        return cb(Errors.WALLET_NOT_FOUND);
      }

      if (opts.supportBIP44AndP2PKH) {
        // New client trying to join legacy wallet
        if (wallet.derivationStrategy == Constants.DERIVATION_STRATEGIES.BIP45) {
          return cb(new ClientError('The wallet you are trying to join was created with an older version of the client app.'));
        }
      } else {
        // Legacy client trying to join new wallet
        if (wallet.derivationStrategy == Constants.DERIVATION_STRATEGIES.BIP44) {
          return cb(new ClientError(Errors.codes.UPGRADE_NEEDED, 'To join this wallet you need to upgrade your client app.'));
        }
      }

      var hash = WalletService._getCopayerHash(opts.name, opts.xPubKey, opts.requestPubKey);

      if (!self._verifySignature(hash, opts.copayerSignature, wallet.pubKey)) {
        return cb(new ClientError());
      }

      if (lodash.find(wallet.copayers, {
        xPubKey: opts.xPubKey
      })) return cb(Errors.COPAYER_IN_WALLET);

      if (wallet.copayers.length == wallet.n) {
        return cb(Errors.WALLET_FULL);
      }

      self._addCopayerToWallet(wallet, opts, cb);
    });
  });
};

/**
 * Save copayer preferences for the current wallet/copayer pair.
 * @param {Object} opts
 * @param {string} opts.email - Email address for notifications.
 * @param {string} opts.language - Language used for notifications.
 * @param {string} opts.unit - Currency unit used to format amounts in notifications.
 */
WalletService.prototype.savePreferences = function(opts, cb) {
  var self = this;
  opts = opts || {};

  var preferences = [{
    name: 'email',
    isValid: function(value) {
      return EmailValidator.validate(value);
    },
  }, {
    name: 'language',
    isValid: function(value) {
      return lodash.isString(value) && value.length == 2;
    },
  }, {
    name: 'unit',
    isValid: function(value) {
      return lodash.isString(value) && lodash.includes(self.ctx.Unit().getCodes(), value);
    },
  }];

  opts = lodash.pick(opts, lodash.map(preferences, 'name'));
  try {
    lodash.each(preferences, function(preference) {
      var value = opts[preference.name];
      if (!value) {
        return;
      }
      if (!preference.isValid(value)) {
        throw 'Invalid ' + preference.name;
        return false;
      }
    });
  } catch (ex) {
    return cb(new ClientError(ex));
  }

  self._runLocked(cb, function(cb) {
    self.storage.fetchPreferences(self.walletId, self.copayerId, function(err, oldPref) {
      if (err) {
        return cb(err);
      }

      var newPref = Model.Preferences.create({
        walletId: self.walletId,
        copayerId: self.copayerId,
      });

      var preferences = Model.Preferences.fromObj(lodash.defaults(newPref, opts, oldPref));

      self.storage.storePreferences(preferences, function(err) {
        return cb(err);
      });
    });
  });
};

/**
 * Retrieves a preferences for the current wallet/copayer pair.
 * @param {Object} opts
 * @returns {Object} preferences
 */
WalletService.prototype.getPreferences = function(opts, cb) {
  var self = this;

  self.storage.fetchPreferences(self.walletId, self.copayerId, function(err, preferences) {
    if (err) {
      return cb(err);
    }
    return cb(null, preferences || {});
  });
};

WalletService.prototype._canCreateAddress = function(ignoreMaxGap, cb) {
  var self = this;

  if (ignoreMaxGap) {
    return cb(null, true);
  }

  self.storage.fetchAddresses(self.walletId, function(err, addresses) {
    if (err) {
      return cb(err);
    }
    var latestAddresses = lodash.takeRight(lodash.reject(addresses, {
      isChange: true
    }), self.ctx.Defaults.MAX_MAIN_ADDRESS_GAP);
    if (latestAddresses.length < self.ctx.Defaults.MAX_MAIN_ADDRESS_GAP || lodash.some(latestAddresses, {
      hasActivity: true
    })) return cb(null, true);

    var bc = self._getBlockchainExplorer(latestAddresses[0].network);
    if (!bc) {
      return cb(new Error('Could not get blockchain explorer instance'));
    }
    var activityFound = false;
    var i = latestAddresses.length;
    async.whilst(function() {
      return i > 0 && !activityFound;
    }, function(next) {
      bc.getAddressActivity(latestAddresses[--i].address, function(err, res) {
        if (err) {
          return next(err);
        }
        activityFound = !!res;
        return next();
      });
    }, function(err) {
      if (err) {
        return cb(err);
      }
      if (!activityFound) {
        return cb(null, false);
      }

      var address = latestAddresses[i];
      address.hasActivity = true;
      self.storage.storeAddress(address, function(err) {
        return cb(err, true);
      });
    });
  });
};

/**
 * Creates a new address.
 * @param {Object} opts
 * @param {Boolean} [opts.ignoreMaxGap=false] - Ignore constraint of maximum number of consecutive addresses without activity
 * @returns {Address} address
 */
WalletService.prototype.createAddress = function(opts, cb) {
  var self = this;

  opts = opts || {};

  function createNewAddress(wallet, cb) {
    var address = wallet.createAddress(false);

    self.storage.storeAddressAndWallet(wallet, address, function(err) {
      if (err) {
        return cb(err);
      }

      self._notify('NewAddress', {
        address: address.address,
      }, function() {
        return cb(null, address);
      });
    });
  };

  function getFirstAddress(wallet, cb) {
    self.storage.fetchAddresses(self.walletId, function(err, addresses) {
      if (err) {
        return cb(err);
      }
      if (!lodash.isEmpty(addresses)) {
        return cb(null, lodash.head(addresses))
      }
      return createNewAddress(wallet, cb);
    });
  };

  self._canCreateAddress(opts.ignoreMaxGap, function(err, canCreate) {
    if (err) {
      return cb(err);
    }
    if (!canCreate) {
      return cb(Errors.MAIN_ADDRESS_GAP_REACHED);
    }

    self._runLocked(cb, function(cb) {
      self.getWallet({}, function(err, wallet) {
        if (err) {
          return cb(err);
        }
        if (!wallet.isComplete()) {
          return cb(Errors.WALLET_NOT_COMPLETE);
        }

        var createFn = wallet.singleAddress ? getFirstAddress : createNewAddress;
        return createFn(wallet, cb);
      });
    });
  });
};

/**
 * Get all addresses.
 * @param {Object} opts
 * @param {Numeric} opts.limit (optional) - Limit the resultset. Return all addresses by default.
 * @param {Boolean} [opts.reverse=false] (optional) - Reverse the order of returned addresses.
 * @returns {Address[]}
 */
WalletService.prototype.getMainAddresses = function(opts, cb) {
  var self = this;

  opts = opts || {};
  self.storage.fetchAddresses(self.walletId, function(err, addresses) {
    if (err) {
      return cb(err);
    }

    var onlyMain = lodash.reject(addresses, {
      isChange: true
    });
    if (opts.reverse) {
      onlyMain.reverse();
    }
    if (opts.limit > 0) {
      onlyMain = lodash.take(onlyMain, opts.limit);
    }

    return cb(null, onlyMain);
  });
};

/**
 * Verifies that a given message was actually sent by an authorized copayer.
 * @param {Object} opts
 * @param {string} opts.message - The message to verify.
 * @param {string} opts.signature - The signature of message to verify.
 * @returns {truthy} The result of the verification.
 */
WalletService.prototype.verifyMessageSignature = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['message', 'signature'], cb)) {
    return;
  }

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }

    var copayer = wallet.getCopayer(self.copayerId);

    var isValid = !!self._getSigningKey(opts.message, opts.signature, copayer.requestPubKeys);
    return cb(null, isValid);
  });
};

WalletService.prototype._getBlockchainExplorer = function(network) {
  var self = this;
  if (self.blockchainExplorer) {
    return self.blockchainExplorer;
  }

  // Use network alias to lookup configuration.
  if (!lodash.includes([Constants.LIVENET, Constants.TESTNET], network)) {
    network = this.ctx.Networks.get(network).alias;
  }

  var config = {};
  var provider;

  if (self.config[self.COIN].blockchainExplorerOpts) {
    // TODO: provider should be configurable
    provider = self.config[self.COIN].blockchainExplorerOpts.defaultProvider;
    if (self.config[self.COIN].blockchainExplorerOpts[provider][network]) {
      config = self.config[self.COIN].blockchainExplorerOpts[provider][network];
    }
  }

  var opts = {};
  opts.provider = provider;
  opts.network = network;
  opts.userAgent = WalletService.getServiceVersion();

  var bc;
  try {
    bc = new self.ctx.BlockchainExplorer(opts, self.config);
  } catch (ex) {
    log.warn('Could not instantiate blockchain explorer', ex);
  }
  return bc;
};

WalletService.prototype._getUtxos = function(addresses, cb) {
  var self = this;

  if (addresses.length == 0) {
    return cb(null, []);
  }
  var networkName = self.ctx.Address(addresses[0]).toObject().network;

  var bc = self._getBlockchainExplorer(networkName);
  if (!bc) {
    return cb(new Error('Could not get blockchain explorer instance'));
  }

  bc.getUtxos(addresses, function(err, utxos) {
    if (err) {
      return cb(err);
    }

    var utxos = lodash.map(utxos, function(utxo) {
      var u = lodash.pick(utxo, ['txid', 'vout', 'address', 'scriptPubKey', 'amount', self.atomicsName, 'confirmations']);
      u.confirmations = u.confirmations || 0;
      u.locked = false;
      u[self.atomicsName] = lodash.isNumber(u[self.atomicsName]) ? +u[self.atomicsName] : self.ctx.Utils.strip(u.amount * 1e8);
      delete u.amount;
      return u;
    });

    return cb(null, utxos);
  });
};

WalletService.prototype._getUtxosForCurrentWallet = function(addresses, cb) {
  var self = this;

  function utxoKey(utxo) {
    return utxo.txid + '|' + utxo.vout
  };

  var allAddresses, allUtxos, utxoIndex;

  async.series([
    function(next) {
      if (lodash.isArray(addresses)) {
        allAddresses = addresses;
        return next();
      }
      self.storage.fetchAddresses(self.walletId, function(err, addresses) {
        allAddresses = addresses;
        return next();
      });
    },
    function(next) {
      if (allAddresses.length == 0) {
        return cb(null, []);
      }

      var addressStrs = lodash.map(allAddresses, 'address');
      self._getUtxos(addressStrs, function(err, utxos) {
        if (err) {
          return next(err);
        }

        if (utxos.length == 0) {
          return cb(null, []);
        }
        allUtxos = utxos;
        utxoIndex = lodash.keyBy(allUtxos, utxoKey);
        return next();
      });
    },
    function(next) {
      self.getPendingTxs({}, function(err, txps) {
        if (err) {
          return next(err);
        }

        var lockedInputs = lodash.map(lodash.flatten(lodash.map(txps, 'inputs')), utxoKey);
        lodash.each(lockedInputs, function(input) {
          if (utxoIndex[input]) {
            utxoIndex[input].locked = true;
          }
        });
        return next();
      });
    },
    function(next) {
      var now = Math.floor(Date.now() / 1000);
      // Fetch latest broadcasted txs and remove any spent inputs from the
      // list of UTXOs returned by the block explorer. This counteracts any out-of-sync
      // effects between broadcasting a tx and getting the list of UTXOs.
      // This is especially true in the case of having multiple instances of the block explorer.
      self.storage.fetchBroadcastedTxs(self.walletId, {
        minTs: now - 24 * 3600,
        limit: 100
      }, function(err, txs) {
        if (err) {
          return next(err);
        }
        var spentInputs = lodash.map(lodash.flatten(lodash.map(txs, 'inputs')), utxoKey);
        lodash.each(spentInputs, function(input) {
          if (utxoIndex[input]) {
            utxoIndex[input].spent = true;
          }
        });
        allUtxos = lodash.reject(allUtxos, {
          spent: true
        });
        return next();
      });
    },
    function(next) {
      // Needed for the clients to sign UTXOs
      var addressToPath = lodash.keyBy(allAddresses, 'address');
      lodash.each(allUtxos, function(utxo) {
        utxo.path = addressToPath[utxo.address].path;
        utxo.publicKeys = addressToPath[utxo.address].publicKeys;
      });
      return next();
    },
  ], function(err) {
    return cb(err, allUtxos);
  });
};

/**
 * Returns list of UTXOs
 * @param {Object} opts
 * @param {Array} opts.addresses (optional) - List of addresses from where to fetch UTXOs.
 * @returns {Array} utxos - List of UTXOs.
 */
WalletService.prototype.getUtxos = function(opts, cb) {
  var self = this;

  opts = opts || {};

  if (lodash.isUndefined(opts.addresses)) {
    self._getUtxosForCurrentWallet(null, cb);
  } else {
    self._getUtxos(opts.addresses, cb);
  }
};

WalletService.prototype._totalizeUtxos = function(utxos) {
  var self = this;

  var balance = {
    totalAmount: lodash.sumBy(utxos, self.atomicsName),
    lockedAmount: lodash.sumBy(lodash.filter(utxos, 'locked'), self.atomicsName),
    totalConfirmedAmount: lodash.sumBy(lodash.filter(utxos, 'confirmations'), self.atomicsName),
    lockedConfirmedAmount: lodash.sumBy(lodash.filter(lodash.filter(utxos, 'locked'), 'confirmations'), self.atomicsName),
  };
  balance.availableAmount = balance.totalAmount - balance.lockedAmount;
  balance.availableConfirmedAmount = balance.totalConfirmedAmount - balance.lockedConfirmedAmount;

  return balance;
};

WalletService.prototype._getBalanceFromAddresses = function(addresses, cb) {
  var self = this;

  self._getUtxosForCurrentWallet(addresses, function(err, utxos) {
    if (err) {
      return cb(err);
    }

    var balance = self._totalizeUtxos(utxos);

    // Compute balance by address
    var byAddress = {};
    lodash.each(lodash.keyBy(lodash.sortBy(utxos, 'address'), 'address'), function(value, key) {
      byAddress[key] = {
        address: key,
        path: value.path,
        amount: 0,
      };
    });

    lodash.each(utxos, function(utxo) {
      byAddress[utxo.address].amount += utxo[self.atomicsName];
    });

    balance.byAddress = lodash.values(byAddress);

    return cb(null, balance);
  });
};

WalletService.prototype._getBalanceOneStep = function(opts, cb) {
  var self = this;

  self.storage.fetchAddresses(self.walletId, function(err, addresses) {
    if (err) {
      return cb(err);
    }
    self._getBalanceFromAddresses(addresses, function(err, balance) {
      if (err) {
        return cb(err);
      }

      // Update cache
      async.series([

        function(next) {
          self.storage.cleanActiveAddresses(self.walletId, next);
        },
        function(next) {
          var active = lodash.map(balance.byAddress, 'address')
          self.storage.storeActiveAddresses(self.walletId, active, next);
        },
      ], function(err) {
        if (err) {
          log.warn('Could not update wallet cache', err);
        }
        return cb(null, balance);
      });
    });
  });
};

WalletService.prototype._getActiveAddresses = function(cb) {
  var self = this;

  self.storage.fetchActiveAddresses(self.walletId, function(err, active) {
    if (err) {
      log.warn('Could not fetch active addresses from cache', err);
      return cb();
    }

    if (!lodash.isArray(active)) {
      return cb();
    }

    self.storage.fetchAddresses(self.walletId, function(err, allAddresses) {
      if (err) {
        return cb(err);
      }

      var now = Math.floor(Date.now() / 1000);
      var recent = lodash.map(lodash.filter(allAddresses, function(address) {
        return address.createdOn > (now - 24 * 3600);
      }), 'address');

      var result = lodash.union(active, recent);

      var index = lodash.keyBy(allAddresses, 'address');
      result = lodash.compact(lodash.map(result, function(r) {
        return index[r];
      }));
      return cb(null, result);
    });
  });
};

/**
 * Get wallet balance.
 * @param {Object} opts
 * @param {Boolean} opts.twoStep[=false] - Optional - Use 2 step balance computation for improved performance
 * @returns {Object} balance - Total amount & locked amount.
 */
WalletService.prototype.getBalance = function(opts, cb) {
  var self = this;

  opts = opts || {};

  if (!opts.twoStep) {
    return self._getBalanceOneStep(opts, cb);
  }

  self.storage.countAddresses(self.walletId, function(err, nbAddresses) {
    if (err) {
      return cb(err);
    }
    if (nbAddresses < self.ctx.Defaults.TWO_STEP_BALANCE_THRESHOLD) {
      return self._getBalanceOneStep(opts, cb);
    }
    self._getActiveAddresses(function(err, activeAddresses) {
      if (err) {
        return cb(err);
      }
      if (!lodash.isArray(activeAddresses)) {
        return self._getBalanceOneStep(opts, cb);
      } else {
        log.debug('Requesting partial balance for ' + activeAddresses.length + ' out of ' + nbAddresses + ' addresses');
        self._getBalanceFromAddresses(activeAddresses, function(err, partialBalance) {
          if (err) {
            return cb(err);
          }
          cb(null, partialBalance);
          setTimeout(function() {
            self._getBalanceOneStep(opts, function(err, fullBalance) {
              if (err) {
                return;
              }
              if (!lodash.isEqual(partialBalance, fullBalance)) {
                log.info('Balance in active addresses differs from final balance');
                self._notify('BalanceUpdated', fullBalance, {
                  isGlobal: true
                });
              }
            });
          }, 1);
          return;
        });
      }
    });
  });
};

/**
 * Return info needed to send all funds in the wallet
 * @param {Object} opts
 * @param {number} opts.feeLevel[='normal'] - Optional. Specify the fee level for this TX ('priority', 'normal', 'economy', 'superEconomy') as defined in Defaults.FEE_LEVELS.
 * @param {number} opts.feePerKb - Optional. Specify the fee per KB for this TX (in atomic units).
 * @param {string} opts.excludeUnconfirmedUtxos[=false] - Optional. Do not use UTXOs of unconfirmed transactions as inputs
 * @param {string} opts.returnInputs[=false] - Optional. Return the list of UTXOs that would be included in the tx.
 * @returns {Object} sendMaxInfo
 */
WalletService.prototype.getSendMaxInfo = function(opts, cb) {
  var self = this;

  opts = opts || {};

  var feeArgs = !!opts.feeLevel + lodash.isNumber(opts.feePerKb);
  if (feeArgs > 1) {
    return cb(new ClientError('Only one of feeLevel/feePerKb can be specified'));
  }

  if (feeArgs == 0) {
    log.debug('No fee provided, using "normal" fee level');
    opts.feeLevel = 'normal';
  }

  if (opts.feeLevel) {
    if (!lodash.some(self.ctx.Defaults.FEE_LEVELS, {
      name: opts.feeLevel
    }))
      return cb(new ClientError('Invalid fee level. Valid values are ' + lodash.map(self.ctx.Defaults.FEE_LEVELS, 'name').join(', ')));
  }

  if (lodash.isNumber(opts.feePerKb)) {
    if (opts.feePerKb < self.ctx.Defaults.MIN_FEE_PER_KB || opts.feePerKb > self.ctx.Defaults.MAX_FEE_PER_KB) {
      return cb(new ClientError('Invalid fee per KB'));
    }
  }

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }
    self._getUtxosForCurrentWallet(null, function(err, utxos) {
      if (err) {
        return cb(err);
      }

      var info = {
        size: 0,
        amount: 0,
        fee: 0,
        feePerKb: 0,
        inputs: [],
        utxosBelowFee: 0,
        amountBelowFee: 0,
        utxosAboveMaxSize: 0,
        amountAboveMaxSize: 0,
      };

      var inputs = lodash.reject(utxos, 'locked');
      if (!!opts.excludeUnconfirmedUtxos) {
        inputs = lodash.filter(inputs, 'confirmations');
      }
      inputs = lodash.sortBy(inputs, function(input) {
        return -input[self.atomicsName];
      });

      if (lodash.isEmpty(inputs)) {
        return cb(null, info);
      }

      self._getFeePerKb(wallet, opts, function(err, feePerKb) {
        if (err) {
          return cb(err);
        }

        info.feePerKb = feePerKb;

        var txp = new self.ctx.TxProposal({
          walletId: self.walletId,
          network: wallet.network,
          walletM: wallet.m,
          walletN: wallet.n,
          feePerKb: feePerKb,
        });

        var baseTxpSize = txp.getEstimatedSize();
        var baseTxpFee = baseTxpSize * txp.feePerKb / 1000.;
        var sizePerInput = txp.getEstimatedSizeForSingleInput();
        var feePerInput = sizePerInput * txp.feePerKb / 1000.;

        var partitionedByAmount = lodash.partition(inputs, function(input) {
          return input[self.atomicsName] > feePerInput;
        });

        info.utxosBelowFee = partitionedByAmount[1].length;
        info.amountBelowFee = lodash.sumBy(partitionedByAmount[1], self.atomicsName);
        inputs = partitionedByAmount[0];

        lodash.each(inputs, function(input, i) {
          var sizeInKb = (baseTxpSize + (i + 1) * sizePerInput) / 1000.;
          if (sizeInKb > self.ctx.Defaults.MAX_TX_SIZE_IN_KB) {
            info.utxosAboveMaxSize = inputs.length - i;
            info.amountAboveMaxSize = lodash.sumBy(lodash.slice(inputs, i), self.atomicsName);
            return false;
          }
          txp.inputs.push(input);
        });

        if (lodash.isEmpty(txp.inputs)) {
          return cb(null, info);
        }

        var fee = txp.getEstimatedFee();
        var amount = lodash.sumBy(txp.inputs, self.atomicsName) - fee;

        if (amount < self.ctx.Defaults.MIN_OUTPUT_AMOUNT) {
          return cb(null, info);
        }

        info.size = txp.getEstimatedSize();
        info.fee = fee;
        info.amount = amount;

        if (opts.returnInputs) {
          info.inputs = lodash.shuffle(txp.inputs);
        }

        return cb(null, info);
      });
    });
  });
};

WalletService.prototype._sampleFeeLevels = function(network, points, cb) {
  var self = this;

  var bc = self._getBlockchainExplorer(network);
  if (!bc) {
    return cb(new Error('Could not get blockchain explorer instance'));
  }
  bc.estimateFee(points, function(err, result) {
    if (err) {
      log.error('Error estimating fee', err);
      return cb(err);
    }

    var failed = [];
    var levels = lodash.fromPairs(lodash.map(points, function(p) {
      var feePerKb = lodash.isObject(result) ? +result[p] : -1;
      if (feePerKb < 0) {
        failed.push(p);
      }

      return [p, self.ctx.Utils.strip(feePerKb * 1e8)];
    }));

    if (failed.length) {
      var logger = network == self.LIVENET ? log.warn : log.debug;
      logger('Could not compute fee estimation in ' + network + ': ' + failed.join(', ') + ' blocks.');
    }

    return cb(null, levels);
  });
};

/**
 * Returns fee levels for the current state of the network.
 * @param {Object} opts
 * @param {string} [opts.network = self.LIVENET] - The network to estimate fee levels from.
 * @returns {Object} feeLevels - A list of fee levels & associated amount per kB in atomic units.
 */
WalletService.prototype.getFeeLevels = function(opts, cb) {
  var self = this;

  opts = opts || {};

  function samplePoints() {
    var definedPoints = lodash.uniq(lodash.map(self.ctx.Defaults.FEE_LEVELS, 'nbBlocks'));
    return lodash.uniq(lodash.flatten(lodash.map(definedPoints, function(p) {
      return lodash.range(p, p + self.ctx.Defaults.FEE_LEVELS_FALLBACK + 1);
    })));
  };

  function getFeeLevel(feeSamples, level, n, fallback) {
    var result;

    if (feeSamples[n] >= 0) {
      result = {
        nbBlocks: n,
        feePerKb: feeSamples[n],
      };
    } else {
      if (fallback > 0) {
        result = getFeeLevel(feeSamples, level, n + 1, fallback - 1);
      } else {
        result = {
          feePerKb: level.defaultValue,
          nbBlocks: null,
        };
      }
    }
    return result;
  };

  var network = opts.network || self.LIVENET;
  if (network != self.LIVENET && network != self.TESTNET) {
    return cb(new ClientError('Invalid network'));
  }

  self._sampleFeeLevels(network, samplePoints(), function(err, feeSamples) {
    var values = lodash.map(self.ctx.Defaults.FEE_LEVELS, function(level) {
      var result = {
        level: level.name,
      };
      if (err) {
        result.feePerKb = level.defaultValue;
        result.nbBlocks = null;
      } else {
        var feeLevel = getFeeLevel(feeSamples, level, level.nbBlocks, self.ctx.Defaults.FEE_LEVELS_FALLBACK);
        result.feePerKb = +(feeLevel.feePerKb * (level.multiplier || 1)).toFixed(0);
        result.nbBlocks = feeLevel.nbBlocks;
      }
      return result;
    });

    // Ensure monotonically decreasing values
    for (var i = 1; i < values.length; i++) {
      values[i].feePerKb = Math.min(values[i].feePerKb, values[i - 1].feePerKb);
    }

    return cb(null, values);
  });
};

WalletService.prototype._estimateFee = function(txp) {
  txp.estimateFee();
};

WalletService.prototype._checkTx = function(txp) {
  var self = this;
  var error;

  var serializationOpts = {
    disableIsFullySigned: true,
    disableSmallFees: true,
    disableLargeFees: true,
  };

  if (txp.getEstimatedSize() / 1000 > self.ctx.Defaults.MAX_TX_SIZE_IN_KB) {
    return Errors.TX_MAX_SIZE_EXCEEDED;
  }

  try {
    var tx = txp.getTx();
    error = tx.getSerializationError(serializationOpts);
    if (!error) {
      txp.fee = tx.getFee();
    }
  } catch (ex) {
    log.error('Error building transaction', ex);
    return ex;
  }

  if (error instanceof errors.Transaction.FeeError) {
    return Errors.INSUFFICIENT_FUNDS_FOR_FEE;
  }

  if (error instanceof errors.Transaction.DustOutputs) {
    return Errors.DUST_AMOUNT;
  }
  return error;
};

WalletService.prototype._selectTxInputs = function(txp, utxosToExclude, cb) {
  var self = this;

  //todo: check inputs are ours and have enough value
  if (txp.inputs && !lodash.isEmpty(txp.inputs)) {
    if (!lodash.isNumber(txp.fee)) {
      self._estimateFee(txp);
    }
    return cb(self._checkTx(txp));
  }

  var txpAmount = txp.getTotalAmount();
  var baseTxpSize = txp.getEstimatedSize();
  var baseTxpFee = baseTxpSize * txp.feePerKb / 1000.;
  var sizePerInput = txp.getEstimatedSizeForSingleInput();
  var feePerInput = sizePerInput * txp.feePerKb / 1000.;

  function sanitizeUtxos(utxos) {
    var excludeIndex = lodash.reduce(utxosToExclude, function(res, val) {
      res[val] = val;
      return res;
    }, {});

    return lodash.filter(utxos, function(utxo) {
      if (utxo.locked) {
        return false;
      }
      if (utxo[self.atomicsName] <= feePerInput) {
        return false;
      }
      if (txp.excludeUnconfirmedUtxos && !utxo.confirmations) {
        return false;
      }
      if (excludeIndex[utxo.txid + ":" + utxo.vout]) {
        return false;
      }
      return true;
    });
  };

  function partitionUtxos(utxos) {
    return lodash.groupBy(utxos, function(utxo) {
      if (utxo.confirmations == 0) {
        return '0'
      }
      if (utxo.confirmations < 6) {
        return '<6';
      }
      return '6+';
    });
  };

  function select(utxos, cb) {
    var totalValueInUtxos = lodash.sumBy(utxos, self.atomicsName);
    var netValueInUtxos = totalValueInUtxos - baseTxpFee - (utxos.length * feePerInput);

    if (totalValueInUtxos < txpAmount) {
      log.debug('Total value in all utxos (' + self.utils.formatAmountInStandard(totalValueInUtxos) + ') is insufficient to cover for txp amount (' + self.utils.formatAmountInStandard(txpAmount) + ')');
      return cb(Errors.INSUFFICIENT_FUNDS);
    }
    if (netValueInUtxos < txpAmount) {
      log.debug('Value after fees in all utxos (' + self.utils.formatAmountInStandard(netValueInUtxos) + ') is insufficient to cover for txp amount (' + self.utils.formatAmountInStandard(txpAmount) + ')');
      return cb(Errors.INSUFFICIENT_FUNDS_FOR_FEE);
    }

    var bigInputThreshold = txpAmount * self.ctx.Defaults.UTXO_SELECTION_MAX_SINGLE_UTXO_FACTOR + (baseTxpFee + feePerInput);
    log.debug('Big input threshold ' + self.utils.formatAmountInStandard(bigInputThreshold));

    var partitions = lodash.partition(utxos, function(utxo) {
      return utxo[self.atomicsName] > bigInputThreshold;
    });

    var bigInputs = lodash.sortBy(partitions[0], self.atomicsName);
    var smallInputs = lodash.sortBy(partitions[1], function(utxo) {
      return -utxo[self.atomicsName];
    });

    log.debug('Considering ' + bigInputs.length + ' big inputs (' + self.utils.formatUtxos(bigInputs) + ')');
    log.debug('Considering ' + smallInputs.length + ' small inputs (' + self.utils.formatUtxos(smallInputs) + ')');

    var total = 0;
    var netTotal = -baseTxpFee;
    var selected = [];
    var fee;
    var error;

    lodash.each(smallInputs, function(input, i) {
      log.debug('Input #' + i + ': ' + self.utils.formatUtxos(input));

      var netInputAmount = input[self.atomicsName] - feePerInput;

      log.debug('The input contributes ' + self.utils.formatAmountInStandard(netInputAmount));

      selected.push(input);

      total += input[self.atomicsName];
      netTotal += netInputAmount;

      var txpSize = baseTxpSize + selected.length * sizePerInput;
      fee = Math.round(baseTxpFee + selected.length * feePerInput);

      log.debug('Tx size: ' + self.ctx.Utils.formatSize(txpSize) + ', Tx fee: ' + self.utils.formatAmountInStandard(fee));

      var feeVsAmountRatio = fee / txpAmount;
      var amountVsUtxoRatio = netInputAmount / txpAmount;

      log.debug('Fee/Tx amount: ' + self.ctx.Utils.formatRatio(feeVsAmountRatio) + ' (max: ' + self.ctx.Utils.formatRatio(self.ctx.Defaults.UTXO_SELECTION_MAX_FEE_VS_TX_AMOUNT_FACTOR) + ')');
      log.debug('Tx amount/Input amount:' + self.ctx.Utils.formatRatio(amountVsUtxoRatio) + ' (min: ' + self.ctx.Utils.formatRatio(self.ctx.Defaults.UTXO_SELECTION_MIN_TX_AMOUNT_VS_UTXO_FACTOR) + ')');

      if (txpSize / 1000. > self.ctx.Defaults.MAX_TX_SIZE_IN_KB) {
        log.debug('Breaking because tx size (' + self.ctx.Utils.formatSize(txpSize) + ') is too big (max: ' + self.ctx.Utils.formatSize(self.ctx.Defaults.MAX_TX_SIZE_IN_KB * 1000.) + ')');
        error = Errors.TX_MAX_SIZE_EXCEEDED;
        return false;
      }

      if (!lodash.isEmpty(bigInputs)) {
        if (amountVsUtxoRatio < self.ctx.Defaults.UTXO_SELECTION_MIN_TX_AMOUNT_VS_UTXO_FACTOR) {
          log.debug('Breaking because utxo is too small compared to tx amount');
          return false;
        }

        if (feeVsAmountRatio > self.ctx.Defaults.UTXO_SELECTION_MAX_FEE_VS_TX_AMOUNT_FACTOR) {
          var feeVsSingleInputFeeRatio = fee / (baseTxpFee + feePerInput);
          log.debug('Fee/Single-input fee: ' + self.ctx.Utils.formatRatio(feeVsSingleInputFeeRatio) + ' (max: ' + self.ctx.Utils.formatRatio(self.ctx.Defaults.UTXO_SELECTION_MAX_FEE_VS_SINGLE_UTXO_FEE_FACTOR) + ')' + ' loses wrt single-input tx: ' + self.utils.formatAmountInStandard((selected.length - 1) * feePerInput));
          if (feeVsSingleInputFeeRatio > self.ctx.Defaults.UTXO_SELECTION_MAX_FEE_VS_SINGLE_UTXO_FEE_FACTOR) {
            log.debug('Breaking because fee is too significant compared to tx amount and it is too expensive compared to using single input');
            return false;
          }
        }
      }

      log.debug('Cumuled total so far: ' + self.utils.formatAmountInStandard(total) + ', Net total so far: ' + self.utils.formatAmountInStandard(netTotal));
      if (netTotal >= txpAmount) {
        var changeAmount = Math.round(total - txpAmount - fee);
        log.debug('Tx change: ', self.utils.formatAmountInStandard(changeAmount));

        var dustThreshold = Math.max(self.ctx.Defaults.MIN_OUTPUT_AMOUNT, self.ctx.Transaction.DUST_AMOUNT);
        if (changeAmount > 0 && changeAmount <= dustThreshold) {
          log.debug('Change below dust threshold (' + self.utils.formatAmountInStandard(dustThreshold) + '). Incrementing fee to remove change.');
          // Remove dust change by incrementing fee
          fee += changeAmount;
        }

        return false;
      }
    });

    if (netTotal < txpAmount) {
      log.debug('Could not reach Txp total (' + self.utils.formatAmountInStandard(txpAmount) + '), still missing: ' + self.utils.formatAmountInStandard(txpAmount - netTotal));

      selected = [];
      if (!lodash.isEmpty(bigInputs)) {
        var input = lodash.head(bigInputs);
        log.debug('Using big input: ', self.utils.formatUtxos(input));

        total = input[self.atomicsName];
        fee = Math.round(baseTxpFee + feePerInput);
        netTotal = total - fee;
        selected = [input];
      }
    }

    if (lodash.isEmpty(selected)) {
      log.debug('Could not find enough funds within this utxo subset');
      return cb(error || Errors.INSUFFICIENT_FUNDS_FOR_FEE);
    }

    return cb(null, selected, fee);
  };

  log.debug('Selecting inputs for a ' + self.utils.formatAmountInStandard(txp.getTotalAmount()) + ' txp');

  self._getUtxosForCurrentWallet(null, function(err, utxos) {
    if (err) {
      return cb(err);
    }

    var totalAmount;
    var availableAmount;

    var balance = self._totalizeUtxos(utxos);
    if (txp.excludeUnconfirmedUtxos) {
      totalAmount = balance.totalConfirmedAmount;
      availableAmount = balance.availableConfirmedAmount;
    } else {
      totalAmount = balance.totalAmount;
      availableAmount = balance.availableAmount;
    }

    if (totalAmount < txp.getTotalAmount()) {
      return cb(Errors.INSUFFICIENT_FUNDS);
    }
    if (availableAmount < txp.getTotalAmount()) {
      return cb(Errors.LOCKED_FUNDS);
    }

    utxos = sanitizeUtxos(utxos);

    log.debug('Considering ' + utxos.length + ' utxos (' + self.utils.formatUtxos(utxos) + ')');

    var groups = [6, 1];
    if (!txp.excludeUnconfirmedUtxos) {
      groups.push(0);
    }

    var inputs = [];
    var fee;
    var selectionError;
    var i = 0;
    var lastGroupLength;
    async.whilst(function() {
      return i < groups.length && lodash.isEmpty(inputs);
    }, function(next) {
      var group = groups[i++];

      var candidateUtxos = lodash.filter(utxos, function(utxo) {
        return utxo.confirmations >= group;
      });

      log.debug('Group >= ' + group);

      // If this group does not have any new elements, skip it
      if (lastGroupLength === candidateUtxos.length) {
        log.debug('This group is identical to the one already explored');
        return next();
      }

      log.debug('Candidate utxos: ' + self.utils.formatUtxos(candidateUtxos));

      lastGroupLength = candidateUtxos.length;

      select(candidateUtxos, function(err, selectedInputs, selectedFee) {
        if (err) {
          log.debug('No inputs selected on this group: ', err);
          selectionError = err;
          return next();
        }

        selectionError = null;
        inputs = selectedInputs;
        fee = selectedFee;

        log.debug('Selected inputs from this group: ' + self.utils.formatUtxos(inputs));
        log.debug('Fee for this selection: ' + self.utils.formatAmountInStandard(fee));

        return next();
      });
    }, function(err) {
      if (err) {
        return cb(err);
      }
      if (selectionError || lodash.isEmpty(inputs)) {
        return cb(selectionError || new Error('Could not select tx inputs'));
      }

      txp.setInputs(lodash.shuffle(inputs));
      txp.fee = fee;

      var err = self._checkTx(txp);

      if (!err) {
        var change = lodash.sumBy(txp.inputs, self.atomicsName) - lodash.sumBy(txp.outputs, 'amount') - txp.fee;
        log.debug('Successfully built transaction. Total fees: ' + self.utils.formatAmountInStandard(txp.fee) + ', total change: ' + self.utils.formatAmountInStandard(change));
      } else {
        log.warn('Error building transaction', err);
      }

      return cb(err);
    });
  });
};

WalletService.prototype._canCreateTx = function(cb) {
  var self = this;
  self.storage.fetchLastTxs(self.walletId, self.copayerId, 5 + self.ctx.Defaults.BACKOFF_OFFSET, function(err, txs) {
    if (err) {
      return cb(err);
    }

    if (!txs.length) {
      return cb(null, true);
    }

    var lastRejections = lodash.takeWhile(txs, {
      status: 'rejected'
    });

    var exceededRejections = lastRejections.length - self.ctx.Defaults.BACKOFF_OFFSET;
    if (exceededRejections <= 0) {
      return cb(null, true);
    }


    var lastTxTs = txs[0].createdOn;
    var now = Math.floor(Date.now() / 1000);
    var timeSinceLastRejection = now - lastTxTs;
    var backoffTime = self.ctx.Defaults.BACKOFF_TIME;

    if (timeSinceLastRejection <= backoffTime) {
      log.debug('Not allowing to create TX: timeSinceLastRejection/backoffTime', timeSinceLastRejection, backoffTime);
    }

    return cb(null, timeSinceLastRejection > backoffTime);
  });
};

WalletService.prototype._validateOutputs = function(opts, wallet, cb) {
  var self = this;
  var dustThreshold = Math.max(self.ctx.Defaults.MIN_OUTPUT_AMOUNT, self.ctx.Transaction.DUST_AMOUNT);

  if (lodash.isEmpty(opts.outputs)) {
    return new ClientError('No outputs were specified');
  }

  for (var i = 0; i < opts.outputs.length; i++) {
    var output = opts.outputs[i];
    output.valid = false;

    if (!self.checkRequired(output, ['toAddress', 'amount'])) {
      return new ClientError('Argument missing in output #' + (i + 1) + '.');
    }

    var toAddress = {};
    try {
      toAddress = new self.ctx.Address(output.toAddress);
    } catch (ex) {
      return Errors.INVALID_ADDRESS;
    }
    if (toAddress.network != wallet.getNetworkName()) {
      return Errors.INCORRECT_ADDRESS_NETWORK;
    }

    if (!lodash.isNumber(output.amount) || lodash.isNaN(output.amount) || output.amount <= 0) {
      return new ClientError('Invalid amount');
    }
    if (output.amount < dustThreshold) {
      return Errors.DUST_AMOUNT;
    }

    output.valid = true;
  }
  return null;
};

WalletService.prototype._validateAndSanitizeTxOpts = function(wallet, opts, cb) {
  var self = this;

  async.series([

    function(next) {
      var feeArgs = !!opts.feeLevel + lodash.isNumber(opts.feePerKb) + lodash.isNumber(opts.fee);
      if (feeArgs > 1) {
        return next(new ClientError('Only one of feeLevel/feePerKb/fee can be specified'));
      }

      if (feeArgs == 0) {
        log.debug('No fee provided, using "normal" fee level');
        opts.feeLevel = 'normal';
      }

      if (opts.feeLevel) {
        if (!lodash.some(self.ctx.Defaults.FEE_LEVELS, {name: opts.feeLevel})) {
          return next(new ClientError('Invalid fee level. Valid values are ' + lodash.map(self.ctx.Defaults.FEE_LEVELS, 'name').join(', ')));
        }
      }

      if (lodash.isNumber(opts.feePerKb)) {
        if (opts.feePerKb < self.ctx.Defaults.MIN_FEE_PER_KB || opts.feePerKb > self.ctx.Defaults.MAX_FEE_PER_KB) {
          return next(new ClientError('Invalid fee per KB'));
        }
      }

      if (lodash.isNumber(opts.fee) && lodash.isEmpty(opts.inputs)) {
        return next(new ClientError('fee can only be set when inputs are specified'));
      }

      next();
    },
    function(next) {
      if (wallet.singleAddress && opts.changeAddress) {
        return next(new ClientError('Cannot specify change address on single-address wallet'));
      }
      next();
    },
    function(next) {
      if (!opts.sendMax) {
        return next();
      }
      if (!lodash.isArray(opts.outputs) || opts.outputs.length > 1) {
        return next(new ClientError('Only one output allowed when sendMax is specified'));
      }
      if (lodash.isNumber(opts.outputs[0].amount)) {
        return next(new ClientError('Amount is not allowed when sendMax is specified'));
      }
      if (lodash.isNumber(opts.fee)) {
        return next(new ClientError('Fee is not allowed when sendMax is specified (use feeLevel/feePerKb instead)'));
      }

      self.getSendMaxInfo({
        feePerKb: opts.feePerKb || self.ctx.Defaults.DEFAULT_FEE_PER_KB,
        excludeUnconfirmedUtxos: !!opts.excludeUnconfirmedUtxos,
        returnInputs: true,
      }, function(err, info) {
        if (err) {
          return next(err);
        }
        opts.outputs[0].amount = info.amount;
        opts.inputs = info.inputs;
        return next();
      });
    },
    function(next) {
      if (opts.validateOutputs === false) {
        return next();
      }
      var validationError = self._validateOutputs(opts, wallet, next);
      if (validationError) {
        return next(validationError);
      }
      next();
    },
  ], cb);
};

WalletService.prototype._getFeePerKb = function(wallet, opts, cb) {
  var self = this;

  if (lodash.isNumber(opts.feePerKb)) {
    return cb(null, opts.feePerKb);
  }
  self.getFeeLevels({
    network: wallet.network
  }, function(err, levels) {
    if (err) {
      return cb(err);
    }
    var level = lodash.find(levels, {
      level: opts.feeLevel
    });
    if (!level) {
      var msg = 'Could not compute fee for "' + opts.feeLevel + '" level';
      log.error(msg);
      return cb(new ClientError(msg));
    }
    return cb(null, level.feePerKb);
  });
};

/**
 * Creates a new transaction proposal.
 * @param {Object} opts
 * @param {string} opts.txProposalId - Optional. If provided it will be used as this TX proposal ID. Should be unique in the scope of the wallet.
 * @param {Array} opts.outputs - List of outputs.
 * @param {string} opts.outputs[].toAddress - Destination address.
 * @param {number} opts.outputs[].amount - Amount to transfer in atomic units.
 * @param {string} opts.outputs[].message - A message to attach to this output.
 * @param {string} opts.message - A message to attach to this transaction.
 * @param {number} opts.feeLevel[='normal'] - Optional. Specify the fee level for this TX ('priority', 'normal', 'economy', 'superEconomy') as defined in Defaults.FEE_LEVELS.
 * @param {number} opts.feePerKb - Optional. Specify the fee per KB for this TX (in atomic units).
 * @param {string} opts.changeAddress - Optional. Use this address as the change address for the tx. The address should belong to the wallet. In the case of singleAddress wallets, the first main address will be used.
 * @param {Boolean} opts.sendMax - Optional. Send maximum amount of funds that make sense under the specified fee/feePerKb conditions. (defaults to false).
 * @param {string} opts.payProUrl - Optional. Paypro URL for peers to verify TX
 * @param {Boolean} opts.excludeUnconfirmedUtxos[=false] - Optional. Do not use UTXOs of unconfirmed transactions as inputs
 * @param {Boolean} opts.validateOutputs[=true] - Optional. Perform validation on outputs.
 * @param {Boolean} opts.dryRun[=false] - Optional. Simulate the action but do not change server state.
 * @param {Array} opts.inputs - Optional. Inputs for this TX
 * @param {number} opts.fee - Optional. Use an fixed fee for this TX (only when opts.inputs is specified)
 * @param {Boolean} opts.noShuffleOutputs - Optional. If set, TX outputs won't be shuffled. Defaults to false
 * @returns {TxProposal} Transaction proposal.
 */
WalletService.prototype.createTx = function(opts, cb) {
  var self = this;

  opts = opts || {};

  function getChangeAddress(wallet, cb) {
    if (wallet.singleAddress) {
      self.storage.fetchAddresses(self.walletId, function(err, addresses) {
        if (err) {
          return cb(err);
        }
        if (lodash.isEmpty(addresses)) {
          return cb(new ClientError('The wallet has no addresses'));
        }
        return cb(null, lodash.head(addresses));
      });
    } else {
      if (opts.changeAddress) {
        self.storage.fetchAddress(opts.changeAddress, function(err, address) {
          if (err) {
            return cb(Errors.INVALID_CHANGE_ADDRESS);
          }
          return cb(null, address);
        });
      } else {
        return cb(null, wallet.createAddress(true));
      }
    }
  };

  function checkTxpAlreadyExists(txProposalId, cb) {
    if (!txProposalId) {
      return cb();
    }
    self.storage.fetchTx(self.walletId, txProposalId, cb);
  };

  self._runLocked(cb, function(cb) {
    var txp, changeAddress, feePerKb;
    self.getWallet({}, function(err, wallet) {
      if (err) {
        return cb(err);
      }
      if (!wallet.isComplete()) {
        return cb(Errors.WALLET_NOT_COMPLETE);
      }

      checkTxpAlreadyExists(opts.txProposalId, function(err, txp) {
        if (err) {
          return cb(err);
        }
        if (txp) {
          return cb(null, txp);
        }

        async.series([
          function(next) {
            self._validateAndSanitizeTxOpts(wallet, opts, next);
          },
          function(next) {
            self._canCreateTx(function(err, canCreate) {
              if (err) {
                return next(err);
              }
              if (!canCreate) {
                return next(Errors.TX_CANNOT_CREATE);
              }
              next();
            });
          },
          function(next) {
            if (opts.sendMax) {
              return next();
            }
            getChangeAddress(wallet, function(err, address) {
              if (err) {
                return next(err);
              }
              changeAddress = address;
              next();
            });
          },
          function(next) {
            if (lodash.isNumber(opts.fee) && !lodash.isEmpty(opts.inputs)) {
              return next();
            }
            self._getFeePerKb(wallet, opts, function(err, fee) {
              feePerKb = fee;
              next();
            });
          },
          function(next) {
            var txOpts = {
              id: opts.txProposalId,
              walletId: self.walletId,
              creatorId: self.copayerId,
              outputs: opts.outputs,
              message: opts.message,
              changeAddress: changeAddress,
              feeLevel: opts.feeLevel,
              feePerKb: feePerKb,
              payProUrl: opts.payProUrl,
              walletM: wallet.m,
              walletN: wallet.n,
              excludeUnconfirmedUtxos: !!opts.excludeUnconfirmedUtxos,
              validateOutputs: !opts.validateOutputs,
              addressType: wallet.addressType,
              customData: opts.customData,
              inputs: opts.inputs,
              fee: opts.inputs && !lodash.isNumber(opts.feePerKb) ? opts.fee : null,
              noShuffleOutputs: opts.noShuffleOutputs
            };

            txp = new self.ctx.TxProposal(txOpts);
            next();
          },
          function(next) {
            self._selectTxInputs(txp, opts.utxosToExclude, next);
          },
          function(next) {
            if (!changeAddress || wallet.singleAddress || opts.dryRun) {
              return next();
            }
            self.storage.storeAddressAndWallet(wallet, txp.changeAddress, next);
          },
          function(next) {
            if (opts.dryRun) {
              return next();
            }
            self.storage.storeTx(wallet.id, txp, function(err) {
              next(err);
            });
          },
        ], function(err) {
          if (err) {
            return cb(err);
          }
          return cb(null, txp);
        });

      });
    });
  });
};
WalletService.prototype._verifyRequestPubKey = function(requestPubKey, signature, xPubKey) {
  var pub = (new HDPublicKey(xPubKey)).deriveChild(Constants.PATHS.REQUEST_KEY_AUTH).publicKey;
  return this.ctx.Utils.verifyMessage(requestPubKey, signature, pub.toString());
};

/**
 * Publish an already created tx proposal so inputs are locked and other copayers in the wallet can see it.
 * @param {Object} opts
 * @param {string} opts.txProposalId - The tx id.
 * @param {string} opts.proposalSignature - S(raw tx). Used by other copayers to verify the proposal.
 */
WalletService.prototype.publishTx = function(opts, cb) {
  var self = this;

  function utxoKey(utxo) {
    return utxo.txid + '|' + utxo.vout
  };

  if (!self.checkRequired(opts, ['txProposalId', 'proposalSignature'], cb)) {
    return;
  }

  self._runLocked(cb, function(cb) {
    self.getWallet({}, function(err, wallet) {
      if (err) {
        return cb(err);
      }
      self.storage.fetchTx(self.walletId, opts.txProposalId, function(err, txp) {
        if (err) {
          return cb(err);
        }
        if (!txp) {
          return cb(Errors.TX_NOT_FOUND);
        }
        if (!txp.isTemporary()) {
          return cb(null, txp);
        }

        var copayer = wallet.getCopayer(self.copayerId);

        var raw;
        try {
          raw = txp.getRawTx();
        } catch (ex) {
          return cb(ex);
        }
        var signingKey = self._getSigningKey(raw, opts.proposalSignature, copayer.requestPubKeys);
        if (!signingKey) {
          return cb(new ClientError('Invalid proposal signature'));
        }

        // Save signature info for other copayers to check
        txp.proposalSignature = opts.proposalSignature;
        if (signingKey.selfSigned) {
          txp.proposalSignaturePubKey = signingKey.key;
          txp.proposalSignaturePubKeySig = signingKey.signature;
        }

        // Verify UTXOs are still available
        self.getUtxos({}, function(err, utxos) {
          if (err) {
            return cb(err);
          }

          var txpInputs = lodash.map(txp.inputs, utxoKey);
          var utxosIndex = lodash.keyBy(utxos, utxoKey);
          var unavailable = lodash.some(txpInputs, function(i) {
            var utxo = utxosIndex[i];
            return !utxo || utxo.locked;
          });

          if (unavailable) {
            return cb(Errors.UNAVAILABLE_UTXOS);
          }

          txp.status = 'pending';
          self.storage.storeTx(self.walletId, txp, function(err) {
            if (err) {
              return cb(err);
            }

            self._notifyTxProposalAction('NewTxProposal', txp, function() {
              return cb(null, txp);
            });
          });
        });
      });
    });
  });
};

/**
 * Retrieves a tx from storage.
 * @param {Object} opts
 * @param {string} opts.txProposalId - The tx id.
 * @returns {Object} txProposal
 */
WalletService.prototype.getTx = function(opts, cb) {
  var self = this;

  self.storage.fetchTx(self.walletId, opts.txProposalId, function(err, txp) {
    if (err) {
      return cb(err);
    }
    if (!txp) {
      return cb(Errors.TX_NOT_FOUND);
    }

    if (!txp.txid) {
      return cb(null, txp);
    }

    self.storage.fetchTxNote(self.walletId, txp.txid, function(err, note) {
      if (err) {
        log.warn('Error fetching tx note for ' + txp.txid);
      }
      txp.note = note;
      return cb(null, txp);
    });
  });
};

/**
 * Edit note associated to a txid.
 * @param {Object} opts
 * @param {string} opts.txid - The txid of the tx on the blockchain.
 * @param {string} opts.body - The contents of the note.
 */
WalletService.prototype.editTxNote = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, 'txid', cb)) {
    return;
  }

  self._runLocked(cb, function(cb) {
    self.storage.fetchTxNote(self.walletId, opts.txid, function(err, note) {
      if (err) {
        return cb(err);
      }

      if (!note) {
        note = Model.TxNote.create({
          walletId: self.walletId,
          txid: opts.txid,
          copayerId: self.copayerId,
          body: opts.body,
        });
      } else {
        note.edit(opts.body, self.copayerId);
      }
      self.storage.storeTxNote(note, function(err) {
        if (err) {
          return cb(err);
        }
        self.storage.fetchTxNote(self.walletId, opts.txid, cb);
      });
    });
  });
};

/**
 * Get tx notes.
 * @param {Object} opts
 * @param {string} opts.txid - The txid associated with the note.
 */
WalletService.prototype.getTxNote = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, 'txid', cb)) {
    return;
  }
  self.storage.fetchTxNote(self.walletId, opts.txid, cb);
};

/**
 * Get tx notes.
 * @param {Object} opts
 * @param {string} opts.minTs[=0] - The start date used to filter notes.
 */
WalletService.prototype.getTxNotes = function(opts, cb) {
  var self = this;

  opts = opts || {};
  self.storage.fetchTxNotes(self.walletId, opts, cb);
};

/**
 * removeWallet
 *
 * @param opts
 * @param cb
 * @return {undefined}
 */
WalletService.prototype.removeWallet = function(opts, cb) {
  var self = this;

  self._runLocked(cb, function(cb) {
    self.storage.removeWallet(self.walletId, cb);
  });
};

WalletService.prototype.getRemainingDeleteLockTime = function(txp) {
  var self = this;
  var now = Math.floor(Date.now() / 1000);

  var lockTimeRemaining = txp.createdOn + self.ctx.Defaults.DELETE_LOCKTIME - now;
  if (lockTimeRemaining < 0) {
    return 0;
  }

  // not the creator? need to wait
  if (txp.creatorId !== self.copayerId) {
    return lockTimeRemaining;
  }

  // has other approvers? need to wait
  var approvers = txp.getApprovers();
  if (approvers.length > 1 || (approvers.length == 1 && approvers[0] !== self.copayerId)) {
    return lockTimeRemaining;
  }

  return 0;
};

/**
 * removePendingTx
 *
 * @param opts
 * @param {string} opts.txProposalId - The tx id.
 * @return {undefined}
 */
WalletService.prototype.removePendingTx = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['txProposalId'], cb)) {
    return;
  }

  self._runLocked(cb, function(cb) {

    self.getTx({
      txProposalId: opts.txProposalId,
    }, function(err, txp) {
      if (err) {
        return cb(err);
      }

      if (!txp.isPending()) {
        return cb(Errors.TX_NOT_PENDING);
      }

      var deleteLockTime = self.getRemainingDeleteLockTime(txp);
      if (deleteLockTime > 0) {
        return cb(Errors.TX_CANNOT_REMOVE);
      }

      self.storage.removeTx(self.walletId, txp.id, function() {
        self._notifyTxProposalAction('TxProposalRemoved', txp, cb);
      });
    });
  });
};

WalletService.prototype._broadcastRawTx = function(network, raw, cb) {
  var bc = this._getBlockchainExplorer(network);
  if (!bc) {
    return cb(new Error('Could not get blockchain explorer instance'));
  }
  bc.broadcast(raw, function(err, txid) {
    if (err) {
      return cb(err);
    }
    return cb(null, txid);
  });
};

/**
 * Broadcast a raw transaction.
 * @param {Object} opts
 * @param {string} [opts.network = self.LIVENET] - The network for this transaction.
 * @param {string} opts.rawTx - Raw tx data.
 */
WalletService.prototype.broadcastRawTx = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['network', 'rawTx'], cb)) {
    return;
  }

  var network = opts.network || self.LIVENET;
  if (network != self.LIVENET && network != self.TESTNET) {
    return cb(new ClientError('Invalid network'));
  }

  self._broadcastRawTx(network, opts.rawTx, cb);
};


WalletService.prototype._checkTxInBlockchain = function(txp, cb) {
  if (!txp.txid) {
    return cb();
  }
  var bc = this._getBlockchainExplorer(txp.getNetworkName());
  if (!bc) {
    return cb(new Error('Could not get blockchain explorer instance'));
  }
  bc.getTransaction(txp.txid, function(err, tx) {
    if (err) {
      return cb(err);
    }
    return cb(null, !!tx);
  })
};

/**
 * Sign a transaction proposal.
 * @param {Object} opts
 * @param {string} opts.txProposalId - The identifier of the transaction.
 * @param {string} opts.signatures - The signatures of the inputs of this tx for this copayer (in apperance order)
 */
WalletService.prototype.signTx = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['txProposalId', 'signatures'], cb)) {
    return;
  }

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }

    self.getTx({
      txProposalId: opts.txProposalId
    }, function(err, txp) {
      if (err) {
        return cb(err);
      }

      var action = lodash.find(txp.actions, {
        copayerId: self.copayerId
      });
      if (action) {
        return cb(Errors.COPAYER_VOTED);
      }
      if (!txp.isPending()) {
        return cb(Errors.TX_NOT_PENDING);
      }

      var copayer = wallet.getCopayer(self.copayerId);

      try {
        if (!txp.sign(self.copayerId, opts.signatures, copayer.xPubKey)) {
          log.warn('Error signing transaction (BAD_SIGNATURES)');
          log.warn('Wallet id:', self.walletId);
          log.warn('Copayer id:', self.copayerId);
          log.warn('Client version:', self.clientVersion);
          log.warn('Arguments:', JSON.stringify(opts));
          log.warn('Transaction proposal:', JSON.stringify(txp));
          var raw = txp.getTx().uncheckedSerialize();
          log.warn('Raw tx:', raw);
          return cb(Errors.BAD_SIGNATURES);
        }
      } catch (ex) {
        log.error('Error signing transaction proposal', ex);
        return cb(ex);
      }

      self.storage.storeTx(self.walletId, txp, function(err) {
        if (err) {
          return cb(err);
        }

        async.series([

          function(next) {
            self._notifyTxProposalAction('TxProposalAcceptedBy', txp, {
              copayerId: self.copayerId,
            }, next);
          },
          function(next) {
            if (txp.isAccepted()) {
              self._notifyTxProposalAction('TxProposalFinallyAccepted', txp, next);
            } else {
              next();
            }
          },
        ], function() {
          return cb(null, txp);
        });
      });
    });
  });
};

WalletService.prototype._processBroadcast = function(txp, opts, cb) {
  var self = this;
  $.checkState(txp.txid);
  opts = opts || {};

  txp.setBroadcasted();
  self.storage.storeTx(self.walletId, txp, function(err) {
    if (err) {
      return cb(err);
    }

    var extraArgs = {
      txid: txp.txid,
    };
    if (opts.byThirdParty) {
      self._notifyTxProposalAction('NewOutgoingTxByThirdParty', txp, extraArgs);
    } else {
      self._notifyTxProposalAction('NewOutgoingTx', txp, extraArgs);
    }

    self.storage.softResetTxHistoryCache(self.walletId, function() {
      return cb(err, txp);
    });
  });
};

/**
 * Broadcast a transaction proposal.
 * @param {Object} opts
 * @param {string} opts.txProposalId - The identifier of the transaction.
 */
WalletService.prototype.broadcastTx = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['txProposalId'], cb)) {
    return;
  }

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }

    self.getTx({
      txProposalId: opts.txProposalId
    }, function(err, txp) {
      if (err) {
        return cb(err);
      }

      if (txp.status == 'broadcasted') {
        return cb(Errors.TX_ALREADY_BROADCASTED);
      }
      if (txp.status != 'accepted') {
        return cb(Errors.TX_NOT_ACCEPTED);
      }

      var raw;
      try {
        raw = txp.getRawTx();
      } catch (ex) {
        return cb(ex);
      }
      self._broadcastRawTx(txp.getNetworkName(), raw, function(err, txid) {
        if (err) {
          var broadcastErr = err;
          // Check if tx already in blockchain
          self._checkTxInBlockchain(txp, function(err, isInBlockchain) {
            if (err) {
              return cb(err);
            }
            if (!isInBlockchain) {
              return cb(broadcastErr);
            }

            self._processBroadcast(txp, {
              byThirdParty: true
            }, cb);
          });
        } else {
          self._processBroadcast(txp, {
            byThirdParty: false
          }, function(err) {
            if (err) {
              return cb(err);
            }
            return cb(null, txp);
          });
        }
      });
    });
  });
};

/**
 * Reject a transaction proposal.
 * @param {Object} opts
 * @param {string} opts.txProposalId - The identifier of the transaction.
 * @param {string} [opts.reason] - A message to other copayers explaining the rejection.
 */
WalletService.prototype.rejectTx = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['txProposalId'], cb)) {
    return;
  }

  self.getTx({
    txProposalId: opts.txProposalId
  }, function(err, txp) {
    if (err) {
      return cb(err);
    }

    var action = lodash.find(txp.actions, {
      copayerId: self.copayerId
    });

    if (action) {
      return cb(Errors.COPAYER_VOTED);
    }
    if (txp.status != 'pending') {
      return cb(Errors.TX_NOT_PENDING);
    }

    txp.reject(self.copayerId, opts.reason);

    self.storage.storeTx(self.walletId, txp, function(err) {
      if (err) {
        return cb(err);
      }

      async.series([
        function(next) {
          self._notifyTxProposalAction('TxProposalRejectedBy', txp, {
            copayerId: self.copayerId,
          }, next);
        },
        function(next) {
          if (txp.status == 'rejected') {
            var rejectedBy = lodash.map(lodash.filter(txp.actions, {
              type: 'reject'
            }), 'copayerId');

            self._notifyTxProposalAction('TxProposalFinallyRejected', txp, {
              rejectedBy: rejectedBy,
            }, next);
          } else {
            next();
          }
        },
      ], function() {
        return cb(null, txp);
      });
    });
  });
};

/**
 * Retrieves pending transaction proposals.
 * @param {Object} opts
 * @returns {TxProposal[]} Transaction proposal.
 */
WalletService.prototype.getPendingTxs = function(opts, cb) {
  var self = this;

  self.storage.fetchPendingTxs(self.walletId, function(err, txps) {
    if (err) {
      return cb(err);
    }

    lodash.each(txps, function(txp) {
      txp.deleteLockTime = self.getRemainingDeleteLockTime(txp);
    });

    async.each(txps, function(txp, next) {
      if (txp.status != 'accepted') {
        return next();
      }

      self._checkTxInBlockchain(txp, function(err, isInBlockchain) {
        if (err || !isInBlockchain) {
          return next(err);
        }
        self._processBroadcast(txp, {
          byThirdParty: true
        }, next);
      });
    }, function(err) {
      return cb(err, lodash.reject(txps, function(txp) {
        return txp.status == 'broadcasted';
      }));
    });
  });
};

/**
 * Retrieves all transaction proposals in the range (maxTs-minTs)
 * Times are in UNIX EPOCH
 *
 * @param {Object} opts.minTs (defaults to 0)
 * @param {Object} opts.maxTs (defaults to now)
 * @param {Object} opts.limit
 * @returns {TxProposal[]} Transaction proposals, newer first
 */
WalletService.prototype.getTxs = function(opts, cb) {
  var self = this;
  self.storage.fetchTxs(self.walletId, opts, function(err, txps) {
    if (err) {
      return cb(err);
    }
    return cb(null, txps);
  });
};

/**
 * Retrieves notifications after a specific id or from a given ts (whichever is more recent).
 *
 * @param {Object} opts
 * @param {Object} opts.notificationId (optional)
 * @param {Object} opts.minTs (optional) - default 0.
 * @returns {Notification[]} Notifications
 */
WalletService.prototype.getNotifications = function(opts, cb) {
  var self = this;
  opts = opts || {};

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }

    async.map([wallet.network, self.walletId], function(walletId, next) {
      self.storage.fetchNotifications(walletId, opts.notificationId, opts.minTs || 0, next);
    }, function(err, res) {
      if (err) {
        return cb(err);
      }

      var notifications = lodash.sortBy(lodash.map(lodash.flatten(res), function(n) {
        n.walletId = self.walletId;
        return n;
      }), 'id');

      return cb(null, notifications);
    });
  });
};

WalletService.prototype._normalizeTxHistory = function(txs) {
  var now = Math.floor(Date.now() / 1000);

  return lodash.map([].concat(txs), function(tx) {
    var inputs = lodash.map(tx.vin, function(item) {
      return {
        address: item.addr,
        amount: item.valueAtomic,
      }
    });

    var outputs = lodash.map(tx.vout, function(item) {
      var itemAddr;
      // If classic multisig, ignore
      if (item.scriptPubKey && lodash.isArray(item.scriptPubKey.addresses) && item.scriptPubKey.addresses.length == 1) {
        itemAddr = item.scriptPubKey.addresses[0];
      }

      return {
        address: itemAddr,
        amount: parseInt((item.value * 1e8).toFixed(0)),
      }
    });

    var t = tx.blocktime; // blocktime
    if (!t || lodash.isNaN(t)) {
      t = tx.firstSeenTs;
    }
    if (!t || lodash.isNaN(t)) {
      t = now;
    }

    return {
      txid: tx.txid,
      confirmations: tx.confirmations,
      blockheight: tx.blockheight,
      fees: parseInt((tx.fees * 1e8).toFixed(0)),
      size: tx.size,
      time: t,
      inputs: inputs,
      outputs: outputs,
    };
  });
};

WalletService._cachedBlockheight;

WalletService.clearBlockheightCache = function() {
  WalletService._cachedBlockheight = null;
};

WalletService._initBlockchainHeightCache = function(networks) {
  if (!WalletService._cachedBlockheight) {
    WalletService._cachedBlockheight = {};
  }

  lodash.forEach(networks, function(n) {
    if (!WalletService._cachedBlockheight[n]) {
      WalletService._cachedBlockheight[n] = {};
    }
  });
};

WalletService._clearBlockchainHeightCache = function(network, targetNetwork) {
  WalletService._initBlockchainHeightCache([targetNetwork.livenet, targetNetwork.testnet]);

  if (!lodash.includes([targetNetwork.livenet, targetNetwork.testnet], network)) {
    log.error('Incorrect network in new block: ' + network);
    return;
  }

  WalletService._cachedBlockheight[network].current = null;
};

WalletService.prototype._getBlockchainHeight = function(network, cb) {
  var self = this;

  var now = Date.now();
  WalletService._initBlockchainHeightCache([self.LIVENET, self.TESTNET]);
  var cache = WalletService._cachedBlockheight[network];

  function fetchFromBlockchain(cb) {
    var bc = self._getBlockchainExplorer(network);
    if (!bc) {
      return cb(new Error('Could not get blockchain explorer instance'));
    }
    bc.getBlockchainHeight(function(err, height) {
      if (!err && height > 0) {
        cache.current = height;
        cache.last = height;
        cache.updatedOn = now;
      }
      return cb(null, cache.last);
    });
  };

  if (!cache.current || (now - cache.updatedOn) > self.ctx.Defaults.BLOCKHEIGHT_CACHE_TIME * 1000) {
    return fetchFromBlockchain(cb);
  }

  return cb(null, cache.current);
};

/**
 * Retrieves all transactions (incoming & outgoing)
 * Times are in UNIX EPOCH
 *
 * @param {Object} opts
 * @param {Number} opts.skip (defaults to 0)
 * @param {Number} opts.limit
 * @param {Number} opts.includeExtendedInfo[=false] - Include all inputs/outputs for every tx.
 * @returns {TxProposal[]} Transaction proposals, first newer
 */
WalletService.prototype.getTxHistory = function(opts, cb) {
  var self = this;

  opts = opts || {};
  opts.limit = (lodash.isUndefined(opts.limit) ? self.ctx.Defaults.HISTORY_LIMIT : opts.limit);
  if (opts.limit > self.ctx.Defaults.HISTORY_LIMIT) {
    return cb(Errors.HISTORY_LIMIT_EXCEEDED);
  }

  function decorate(wallet, txs, addresses, proposals, notes) {
    var indexedAddresses = lodash.keyBy(addresses, 'address');
    var indexedProposals = lodash.keyBy(proposals, 'txid');
    var indexedNotes = lodash.keyBy(notes, 'txid');

    function sum(items, isMine, isChange) {
      var filter = {};
      if (lodash.isBoolean(isMine)) {
        filter.isMine = isMine;
      }
      if (lodash.isBoolean(isChange)) {
        filter.isChange = isChange;
      }
      return lodash.sumBy(lodash.filter(items, filter), 'amount');
    };

    function classify(items) {
      return lodash.map(items, function(item) {
        var address = indexedAddresses[item.address];
        return {
          address: item.address,
          amount: item.amount,
          isMine: !!address,
          isChange: address ? (address.isChange || wallet.singleAddress) : false,
        }
      });
    };

    return lodash.map(txs, function(tx) {

      var amountIn, amountOut, amountOutChange;
      var amount, action, addressTo;
      var inputs, outputs;

      if (tx.outputs.length || tx.inputs.length) {

        inputs = classify(tx.inputs);
        outputs = classify(tx.outputs);

        amountIn = sum(inputs, true);
        amountOut = sum(outputs, true, false);
        amountOutChange = sum(outputs, true, true);
        if (amountIn == (amountOut + amountOutChange + (amountIn > 0 ? tx.fees : 0))) {
          amount = amountOut;
          action = 'moved';
        } else {
          amount = amountIn - amountOut - amountOutChange - (amountIn > 0 ? tx.fees : 0);
          action = amount > 0 ? 'sent' : 'received';
        }

        amount = Math.abs(amount);
        if (action == 'sent' || action == 'moved') {
          var firstExternalOutput = lodash.find(outputs, {
            isMine: false
          });
          addressTo = firstExternalOutput ? firstExternalOutput.address : 'N/A';
        };
      } else {
        action = 'invalid';
        amount = 0;
      }

      function formatOutput(o) {
        return {
          amount: o.amount,
          address: o.address
        }
      };

      var newTx = {
        txid: tx.txid,
        action: action,
        amount: amount,
        fees: tx.fees,
        time: tx.time,
        addressTo: addressTo,
        confirmations: tx.confirmations,
      };

      if (lodash.isNumber(tx.size) && tx.size > 0) {
        newTx.feePerKb = +(tx.fees * 1000 / tx.size).toFixed();
      }

      if (opts.includeExtendedInfo) {
        newTx.inputs = lodash.map(inputs, function(input) {
          return lodash.pick(input, 'address', 'amount', 'isMine');
        });
        newTx.outputs = lodash.map(outputs, function(output) {
          return lodash.pick(output, 'address', 'amount', 'isMine');
        });
      } else {
        outputs = lodash.filter(outputs, {
          isChange: false
        });
        if (action == 'received') {
          outputs = lodash.filter(outputs, {
            isMine: true
          });
        }
        newTx.outputs = lodash.map(outputs, formatOutput);
      }

      var proposal = indexedProposals[tx.txid];
      if (proposal) {
        newTx.createdOn = proposal.createdOn;
        newTx.proposalId = proposal.id;
        newTx.proposalType = proposal.type;
        newTx.creatorName = proposal.creatorName;
        newTx.message = proposal.message;
        newTx.actions = lodash.map(proposal.actions, function(action) {
          return lodash.pick(action, ['createdOn', 'type', 'copayerId', 'copayerName', 'comment']);
        });
        lodash.each(newTx.outputs, function(output) {
          var query = {
            toAddress: output.address,
            amount: output.amount
          };
          var txpOut = lodash.find(proposal.outputs, query);
          output.message = txpOut ? txpOut.message : null;
        });
        newTx.customData = proposal.customData;
        // newTx.sentTs = proposal.sentTs;
        // newTx.merchant = proposal.merchant;
        //newTx.paymentAckMemo = proposal.paymentAckMemo;
      }

      var note = indexedNotes[tx.txid];
      if (note) {
        newTx.note = lodash.pick(note, ['body', 'editedBy', 'editedByName', 'editedOn']);
      }

      return newTx;
    });
  };

  function getNormalizedTxs(addresses, from, to, cb) {
    var txs, fromCache, totalItems;
    var useCache = addresses.length >= self.ctx.Defaults.HISTORY_CACHE_ADDRESS_THRESOLD;
    var network = self.ctx.Address(addresses[0].address).toObject().network;

    async.series([

      function(next) {
        if (!useCache) {
          return next();
        }

        self.storage.getTxHistoryCache(self.walletId, from, to, function(err, res) {
          if (err) {
            return next(err);
          }
          if (!res || !res[0]) {
            return next();
          }

          txs = res;
          fromCache = true;

          return next()
        });
      },
      function(next) {
        if (txs) {
          return next();
        }

        var addressStrs = lodash.map(addresses, 'address');
        var bc = self._getBlockchainExplorer(network);
        if (!bc) {
          return cb(new Error('Could not get blockchain explorer instance'));
        }
        bc.getTransactions(addressStrs, from, to, function(err, rawTxs, total) {
          if (err) {
            return next(err);
          }

          txs = self._normalizeTxHistory(rawTxs);
          totalItems = total;
          return next();
        });
      },
      function(next) {
        if (!useCache || fromCache) {
          return next();
        }

        var txsToCache = lodash.filter(txs, function(i) {
          return i.confirmations >= self.ctx.Defaults.CONFIRMATIONS_TO_START_CACHING;
        }).reverse();

        if (!txsToCache.length) {
          return next();
        }

        var fwdIndex = totalItems - to;
        if (fwdIndex < 0) {
          fwdIndex = 0;
        }
        self.storage.storeTxHistoryCache(self.walletId, totalItems, fwdIndex, txsToCache, next);
      },
      function(next) {
        if (!useCache || !fromCache) {
          return next();
        }
        if (!txs) {
          return next();
        }

        // Fix tx confirmations for cached txs
        self._getBlockchainHeight(network, function(err, height) {
          if (err || !height) {
            return next(err);
          }
          lodash.each(txs, function(tx) {
            if (tx.blockheight >= 0) {
              tx.confirmations = height - tx.blockheight + 1;
            }
          });
          next();
        });
      },
    ], function(err) {
      if (err) {
        return cb(err);
      }

      return cb(null, {
        items: txs,
        fromCache: fromCache
      });
    });
  };

  function tagLowFees(wallet, txs, cb) {
    var unconfirmed = lodash.filter(txs, {
      confirmations: 0
    });
    if (lodash.isEmpty(unconfirmed)) {
      return cb();
    }

    self.getFeeLevels({
      network: wallet.network
    }, function(err, levels) {
      if (err) {
        log.warn('Could not fetch fee levels', err);
      } else {
        var level = lodash.find(levels, {
          level: 'superEconomy'
        });
        if (!level || !level.nbBlocks) {
          log.debug('Cannot compute super economy fee level from blockchain');
        } else {
          var minFeePerKb = level.feePerKb;
          lodash.each(unconfirmed, function(tx) {
            tx.lowFees = tx.feePerKb < minFeePerKb;
          });
        }
      }
      return cb();
    });
  };

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }

    // Get addresses for this wallet
    self.storage.fetchAddresses(self.walletId, function(err, addresses) {
      if (err) {
        return cb(err);
      }
      if (addresses.length == 0) {
        return cb(null, []);
      }

      var from = opts.skip || 0;
      var to = from + opts.limit;


      async.waterfall([

        function(next) {
          getNormalizedTxs(addresses, from, to, next);
        },
        function(txs, next) {
          // Fetch all proposals in [t - 7 days, t + 1 day]
          var minTs = 0;
          var maxTs = 0;
          if (!lodash.isEmpty(txs.items)) {
            minTs = lodash.minBy(txs.items, 'time').time - 7 * 24 * 3600;
            maxTs = lodash.maxBy(txs.items, 'time').time + 1 * 24 * 3600;
          }

          async.parallel([

            function(done) {
              self.storage.fetchTxs(self.walletId, {
                minTs: minTs,
                maxTs: maxTs
              }, done);
            },
            function(done) {
              self.storage.fetchTxNotes(self.walletId, {
                minTs: minTs
              }, done);
            },
          ], function(err, res) {
            return next(err, {
              txs: txs,
              txps: res[0],
              notes: res[1]
            });
          });
        },
      ], function(err, res) {
        if (err) {
          return cb(err);
        }

        var finalTxs = decorate(wallet, res.txs.items, addresses, res.txps, res.notes);

        tagLowFees(wallet, finalTxs, function(err) {
          if (err) {
            log.warn('Failed to tag unconfirmed with low fee');
          }

          if (res.txs.fromCache) {
            log.debug("History from cache for:", self.walletId, from, to);
          }

          return cb(null, finalTxs, !!res.txs.fromCache);
        });
      });
    });
  });
};

/**
 * Scan the blockchain looking for addresses having some activity
 *
 * @param {Object} opts
 * @param {Boolean} opts.includeCopayerBranches (defaults to false)
 */
WalletService.prototype.scan = function(opts, cb) {
  var self = this;

  opts = opts || {};

  function checkActivity(address, network, cb) {
    var bc = self._getBlockchainExplorer(network);
    if (!bc) {
      return cb(new Error('Could not get blockchain explorer instance'));
    }
    bc.getAddressActivity(address, cb);
  };

  function scanBranch(derivator, cb) {
    var inactiveCounter = 0;
    var allAddresses = [];
    var gap = self.ctx.Defaults.SCAN_ADDRESS_GAP;

    async.whilst(function() {
      return inactiveCounter < gap;
    }, function(next) {
      var address = derivator.derive();
      checkActivity(address.address, address.network, function(err, activity) {
        if (err) {
          return next(err);
        }

        allAddresses.push(address);
        inactiveCounter = activity ? 0 : inactiveCounter + 1;
        next();
      });
    }, function(err) {
      derivator.rewind(gap);
      return cb(err, lodash.dropRight(allAddresses, gap));
    });
  };

  self._runLocked(cb, function(cb) {
    self.getWallet({}, function(err, wallet) {
      if (err) {
        return cb(err);
      }
      if (!wallet.isComplete()) {
        return cb(Errors.WALLET_NOT_COMPLETE);
      }

      wallet.scanStatus = 'running';

      self.storage.clearTxHistoryCache(self.walletId, function() {
        self.storage.storeWallet(wallet, function(err) {
          if (err) {
            return cb(err);
          }

          var derivators = [];
          lodash.each([false, true], function(isChange) {
            derivators.push({
              derive: lodash.bind(wallet.createAddress, wallet, isChange),
              rewind: lodash.bind(wallet.addressManager.rewindIndex, wallet.addressManager, isChange),
            });
            if (opts.includeCopayerBranches) {
              lodash.each(wallet.copayers, function(copayer) {
                if (copayer.addressManager) {
                  derivators.push({
                    derive: lodash.bind(copayer.createAddress, copayer, wallet, isChange),
                    rewind: lodash.bind(copayer.addressManager.rewindIndex, copayer.addressManager, isChange),
                  });
                }
              });
            }
          });

          async.eachSeries(derivators, function(derivator, next) {
            scanBranch(derivator, function(err, addresses) {
              if (err) {
                return next(err);
              }
              self.storage.storeAddressAndWallet(wallet, addresses, next);
            });
          }, function(error) {
            self.storage.fetchWallet(wallet.id, function(err, wallet) {
              if (err) {
                return cb(err);
              }
              wallet.scanStatus = error ? 'error' : 'success';
              self.storage.storeWallet(wallet, function() {
                return cb(error);
              });
            })
          });
        });
      });
    });
  });
};

/**
 * Start a scan process.
 *
 * @param {Object} opts
 * @param {Boolean} opts.includeCopayerBranches (defaults to false)
 */
WalletService.prototype.startScan = function(opts, cb) {
  var self = this;

  function scanFinished(err) {
    var data = {
      result: err ? 'error' : 'success',
    };
    if (err) {
      data.error = err;
    }
    self._notify('ScanFinished', data, {
      isGlobal: true
    });
  };

  self.getWallet({}, function(err, wallet) {
    if (err) {
      return cb(err);
    }
    if (!wallet.isComplete()) {
      return cb(Errors.WALLET_NOT_COMPLETE);
    }

    setTimeout(function() {
      self.scan(opts, scanFinished);
    }, 100);

    return cb(null, {
      started: true
    });
  });
};

/**
 * Returns exchange rate for the specified currency & timestamp.
 * @param {Object} opts
 * @param {string} opts.code - Currency ISO code.
 * @param {Date} [opts.ts] - A timestamp to base the rate on (default Date.now()).
 * @param {String} [opts.provider] - A provider of exchange rates (default 'OpenWalletStack').
 * @returns {Object} rates - The exchange rate.
 */
WalletService.prototype.getFiatRate = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['code'], cb)) {
    return;
  }

  self.fiatRateService.getRate(opts, function(err, rate) {
    if (err) {
      return cb(err);
    }
    return cb(null, rate);
  });
};

/**
 * Subscribe this copayer to the Push Notifications service using the specified token.
 * @param {Object} opts
 * @param {string} opts.token - The token representing the app/device.
 * @param {string} [opts.packageName] - The restricted_package_name option associated with this token.
 * @param {string} [opts.platform] - The platform associated with this token.
 */
WalletService.prototype.pushNotificationsSubscribe = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['token'], cb)) {
    return;
  }

  var sub = Model.PushNotificationSub.create({
    copayerId: self.copayerId,
    token: opts.token,
    packageName: opts.packageName,
    platform: opts.platform,
  });

  self.storage.storePushNotificationSub(sub, cb);
};

/**
 * Unsubscribe this copayer to the Push Notifications service using the specified token.
 * @param {Object} opts
 * @param {string} opts.token - The token representing the app/device.
 */
WalletService.prototype.pushNotificationsUnsubscribe = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['token'], cb)) {
    return;
  }
  self.storage.removePushNotificationSub(self.copayerId, opts.token, cb);
};

/**
 * Subscribe this copayer to the specified tx to get a notification when the tx confirms.
 * @param {Object} opts
 * @param {string} opts.txid - The txid of the tx to be notified of.
 */
WalletService.prototype.txConfirmationSubscribe = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['txid'], cb)) {
    return;
  }

  var sub = Model.TxConfirmationSub.create({
    copayerId: self.copayerId,
    walletId: self.walletId,
    txid: opts.txid,
  });

  self.storage.storeTxConfirmationSub(sub, cb);
};

/**
 * Unsubscribe this copayer to the Push Notifications service using the specified token.
 * @param {Object} opts
 * @param {string} opts.txid - The txid of the tx to be notified of.
 */
WalletService.prototype.txConfirmationUnsubscribe = function(opts, cb) {
  var self = this;

  if (!self.checkRequired(opts, ['txid'], cb)) {
    return;
  }

  self.storage.removeTxConfirmationSub(self.copayerId, opts.txid, cb);
};

module.exports = WalletService;
module.exports.ClientError = ClientError;
