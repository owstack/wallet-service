let BchWalletService;
let BtcWalletService;
let LtcWalletService;

const owsCommon = require('@owstack/ows-common');
const baseConfig = require('config');
const bodyParser = require('body-parser');
const compression = require('compression');
const ClientError = require('./errors/clienterror');
const Constants = require('./common/constants');
const Context = owsCommon.util.Context;
const Defaults = require('./common/defaults');
const express = require('express');
const log = require('npmlog');
const morgan = require('morgan');
const RateLimit = require('express-rate-limit');
const Stats = require('./stats');
const Storage = require('./storage');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

log.disableColor();
log.debug = log.verbose;

/**
 * Constructor
 *
 * @param config
 * @param config.basePath - base path for the server API.
 * @param config.disableLogs - disables logging if true.
 * @param config.ignoreRateLimiter - ignores rate rate limiter if true.
 * @param config.BCH (optional*) - Bitcoin Cash service configuration.
 * @param config.BTC (optional*) - Bitcoin service configuration.
 * @param config.LTC (optional*) - Litecoin service configuration.
 * @param {Callback} cb
 *
 * For each service the following configuration parameters may be set. If the service
 * configuration is not specified then default values are used (if any).
 *
 * @param config.{service}.blockchainExplorerOpts
 * @param config.{service}.fiatRateServiceOpts
 */
class ExpressApp {
    constructor(config) {
        this.config = config || baseConfig;

        if (!this.config.basePath) {
            throw 'Cannot start Express server, no basePath configuration';
        }

        this.app = express();

        // Establish a database connection.
        const storage = new Storage(new Context(), this.config.storageOpts, {
            creator: 'Wallet Services'
        });

        storage.connect(function (err) {
            if (err) {
                console.log(err);
            }
        });
    }
}

/**
 * Start the express server.
 */
ExpressApp.prototype.start = function (opts, cb) {
    const self = this;
    self.opts = opts || {};

    self.app.use(compression());

    self.app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'x-signature,x-identity,x-session,x-client-version,x-wallet-id,X-Requested-With,Content-Type,Authorization');
        next();
    });

    const allowCORS = function (req, res, next) {
        if ('OPTIONS' == req.method) {
            res.sendStatus(200);
            res.end();
            return;
        }
        next();
    };

    self.app.use(allowCORS);
    self.app.enable('trust proxy');

    // Handle `abort`, see https://nodejs.org/api/http.html#http_event_abort
    self.app.use(function (req, res, next) {
        req.on('abort', function () {
            log.warn('Request aborted by the client');
        });
        next();
    });

    const POST_LIMIT = 1024 * 100 /* Max POST 100 kb */ ;

    self.app.use(bodyParser.json({
        limit: POST_LIMIT
    }));

    if (self.config.log) {
        log.level = (self.config.log.disable == true ? 'silent' : self.config.log.level || 'info');
    } else {
        log.level = 'info';
    }

    if (log.level != 'silent') {
        morgan.token('service', function getId(req) {
            return req.query['service'];
        });

        morgan.token('walletId', function getId(req) {
            return req.walletId;
        });

        morgan.token('copayerId', function getId(req) {
            return req.copayerId;
        });

        const logFormat = ':remote-addr :date[iso] :service ":method :url" :status :res[content-length] :response-time ":user-agent" :walletId :copayerId';
        const logOpts = {
            skip: function (req, res) {
                if (res.statusCode != 200) {
                    return false;
                }
                return req.path.indexOf('/notifications/') >= 0;
            }
        };
        self.app.use(morgan(logFormat, logOpts));
    }

    const router = express.Router();

    function returnError(err, res, req) {
        if (err instanceof ClientError) {

            const status = (err.code == 'NOT_AUTHORIZED') ? 401 : 400;
            if (!self.config.disableLogs) {
                log.info(`Client Err: ${  status  } ${  req.url  } ${  JSON.stringify(err)}`);
            }

            res.status(status).json({
                code: err.code,
                message: err.message
            }).end();
        } else {

            let code = 500;
            let message;
            if (lodash.isObject(err)) {
                code = err.code || err.statusCode;
                message = err.message || err.body;
            }

            const m = message || err.toString();

            if (!self.config.disableLogs) {
                log.error(`${req.url  } :${  code  }:${  m}`);
            }

            res.status(code || 500).json({
                error: m
            }).end();
        }
    }

    function logDeprecated(req) {
        log.warn('DEPRECATED', req.method, req.url, `(${  req.header('x-client-version')  })`);
    }

    function getCredentials(req) {
        const identity = req.header('x-identity');
        if (!identity) {
            return;
        }

        return {
            copayerId: identity,
            signature: req.header('x-signature'),
            session: req.header('x-session'),
        };
    }

    /**
   * Service resolvers return a constucted server instance for the specified network service.
   */

    /**
   * Bitcoin.
   */
    function resolveBtcServer(req, res, cb, auth, opts) {
        if (!self.config.BTC) {
            throw 'Cannot instance a BTC server, no configuration found';
        }
        if (!BtcWalletService) {
            BtcWalletService = require('../../btc-service').WalletService;
        }

        res.setHeader('x-service-version', BtcWalletService.Server.getServiceVersion());

        opts.serviceOpts = opts.serviceOpts || {};

        if (opts.serviceClassOnly) {
            return cb(BtcWalletService);
        }

        if (auth) {
            BtcWalletService.Server.getInstanceWithAuth(opts.serviceOpts, self.config, auth, cb);
        } else {
            BtcWalletService.Server.getInstance(opts.serviceOpts, self.config, cb);
        }
    }

    /**
   * Bitcoin Cash.
   */
    function resolveBchServer(req, res, cb, auth, opts) {
        if (!self.config.BCH) {
            throw 'Cannot instance a BCH server, no configuration found';
        }
        if (!BchWalletService) {
            BchWalletService = require('../../bch-service').WalletService;
        }

        opts.serviceOpts = opts.serviceOpts || {};

        res.setHeader('x-service-version', BchWalletService.Server.getServiceVersion());

        if (opts.serviceClassOnly) {
            return cb(BchWalletService);
        }

        if (auth) {
            BchWalletService.Server.getInstanceWithAuth(opts.serviceOpts, self.config, auth, cb);
        } else {
            BchWalletService.Server.getInstance(opts.serviceOpts, self.config, cb);
        }
    }

    /**
   * Litecoin.
   */
    function resolveLtcServer(req, res, cb, auth, opts) {
        if (!self.config.LTC) {
            throw 'Cannot instance an LTC server, no configuration found';
        }
        if (!LtcWalletService) {
            LtcWalletService = require('../../ltc-service').WalletService;
        }

        res.setHeader('x-service-version', LtcWalletService.Server.getServiceVersion());

        opts.serviceOpts = opts.serviceOpts || {};

        if (opts.serviceClassOnly) {
            return cb(LtcWalletService);
        }

        if (auth) {
            LtcWalletService.Server.getInstanceWithAuth(opts.serviceOpts, self.config, auth, cb);
        } else {
            LtcWalletService.Server.getInstance(opts.serviceOpts, self.config, cb);
        }
    }

    /**
   * Return only the service class for the given request.
   */
    function resolveService(req, res, cb) {
        const opts = {
            serviceClassOnly: true
        };
        resolveServer(req, res, cb, null, opts);
    }

    /**
   * Inspect the request header for the requested service and return
   * a reference to the service object.
   */
    function resolveServer(req, res, cb, auth, resolverOpts) {
        $.checkArgument(req && res && cb);

        const opts = resolverOpts || {};
        opts.serviceOpts = {
            clientVersion: req.header('x-client-version')
        };

        lodash.defaults(opts.serviceOpts, self.opts);

        const service = req.query['service'];
        switch (service) {
            case Constants.SERVICE_BITCOIN:      return resolveBtcServer(req, res, cb, auth, opts);
            case Constants.SERVICE_BITCOIN_CASH: return resolveBchServer(req, res, cb, auth, opts);
            case Constants.SERVICE_LITECOIN:     return resolveLtcServer(req, res, cb, auth, opts);

            default:
                throw new ClientError({
                    code: 'UNKNOWN_SERVICE'
                });
        }
    }

    function getServer(req, res, cb) {
        resolveServer(req, res, cb);
    }

    function getServerWithAuth(req, res, cb, opts) {
        opts = opts || {};

        const credentials = getCredentials(req);
        if (!credentials) {
            return returnError(new ClientError({
                code: 'NOT_AUTHORIZED'
            }), res, req);
        }

        const auth = {
            copayerId: credentials.copayerId,
            message: `${req.method.toLowerCase()  }|${  req.url  }|${  JSON.stringify(req.body)}`,
            signature: credentials.signature,
            walletId: req.header('x-wallet-id')
        };

        if (opts.allowSession) {
            auth.session = credentials.session;
        }

        resolveServer(req, res, function (err, server) {
            if (err) {
                return returnError(err, res, req);
            }

            if (opts.onlySupportStaff && !server.copayerIsSupportStaff) {
                return returnError(new ClientError({
                    code: 'NOT_AUTHORIZED'
                }), res, req);
            }

            // For logging
            req.walletId = server.walletId;
            req.copayerId = server.copayerId;

            return cb(server);
        }, auth);
    }

    let createWalletLimiter;

    if (Defaults.RateLimit.createWallet && !self.config.ignoreRateLimiter) {
        log.info('', 'Limiting wallet creation per IP: %d req/h', (Defaults.RateLimit.createWallet.max / Defaults.RateLimit.createWallet.windowMs * 60 * 60 * 1000).toFixed(2));
        createWalletLimiter = new RateLimit(Defaults.RateLimit.createWallet);
    // router.use(/\/v\d+\/wallets\/$/, createWalletLimiter)
    } else {
        createWalletLimiter = function (req, res, next) {
            next();
        };
    }

    router.put('/v1/copayers/:id/', function (req, res) {
        req.body.copayerId = req.params['id'];
        try {
            getServer(req, res, function (server) {
                server.addAccess(req.body, function (err, result) {
                    if (err) {
                        return returnError(err, res, req);
                    }
                    result.wallet = result.wallet.toObject();
                    res.json(result);
                });
            });
        } catch (ex) {
            return returnError(ex, res, req);
        }
    });

    router.post('/v1/wallets/', createWalletLimiter, function (req, res) {
        try {
            getServer(req, res, function (server) {
                server.createWallet(req.body, function (err, walletId) {
                    if (err) {
                        return returnError(err, res, req);
                    }
                    res.json({
                        walletId: walletId,
                    });
                });
            });
        } catch (ex) {
            return returnError(ex, res, req);
        }
    });

    router.post('/v1/wallets/:id/copayers/', function (req, res) {
        req.body.walletId = req.params['id'];
        try {
            getServer(req, res, function (server) {
                server.joinWallet(req.body, function (err, result) {
                    if (err) {
                        return returnError(err, res, req);
                    }
                    result.wallet = result.wallet.toObject();
                    res.json(result);
                });
            });
        } catch (ex) {
            return returnError(ex, res, req);
        }
    });

    router.get('/v1/wallets/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {};
            if (req.query.includeExtendedInfo == '1') {
                opts.includeExtendedInfo = true;
            }
            if (req.query.twoStep == '1') {
                opts.twoStep = true;
            }
            server.getStatus(opts, function (err, status) {
                if (err) {
                    return returnError(err, res, req);
                }
                status.wallet = (status.wallet && status.wallet.toObject ? status.wallet.toObject() : status.wallet);
                status.pendingTxps = status.pendingTxps && lodash.map(status.pendingTxps, function (txp) {
                    return txp.toObject();
                });
                res.json(status);
            });
        });
    });

    router.get('/v1/wallets/:identifier/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {
                identifier: req.params['identifier'],
            };
            server.getWalletFromIdentifier(opts, function (err, wallet) {
                if (err) {
                    return returnError(err, res, req);
                }
                if (!wallet) {
                    return res.end();
                }

                server.walletId = wallet.id;
                const opts = {};
                if (req.query.includeExtendedInfo == '1') {
                    opts.includeExtendedInfo = true;
                }
                if (req.query.twoStep == '1') {
                    opts.twoStep = true;
                }
                server.getStatus(opts, function (err, status) {
                    if (err) {
                        return returnError(err, res, req);
                    }
                    status.wallet = (status.wallet && status.wallet.toObject ? status.wallet.toObject() : status.wallet);
                    status.pendingTxps = status.pendingTxps && lodash.map(status.pendingTxps, function (txp) {
                        return txp.toObject();
                    });
                    res.json(status);
                });
            });
        }, {
            onlySupportStaff: true
        });
    });

    router.get('/v1/preferences/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.getPreferences({}, function (err, preferences) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(preferences);
            });
        });
    });

    router.put('/v1/preferences', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.savePreferences(req.body, function (err, result) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(result);
            });
        });
    });

    router.get('/v1/txproposals/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.getPendingTxs({}, function (err, pendings) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(lodash.map(pendings, function (pending) {
                    return pending.toObject();
                }));
            });
        });
    });

    router.post('/v1/txproposals/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.createTx(req.body, function (err, txp) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txp.toObject ? txp.toObject() : txp);
            });
        });
    });

    router.post('/v1/addresses/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.createAddress(req.body, function (err, address) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(address.toObject ? address.toObject() : address);
            });
        });
    });

    router.get('/v1/addresses/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {};
            if (req.query.limit) {
                opts.limit = +req.query.limit;
            }
            opts.reverse = (req.query.reverse == '1');

            server.getMainAddresses(opts, function (err, addresses) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(lodash.map(addresses, function (addr) {
                    return (addr.toObject ? addr.toObject() : addr);
                }));
            });
        });
    });

    router.get('/v1/balance/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {};
            if (req.query.twoStep == '1') {
                opts.twoStep = true;
            }
            server.getBalance(opts, function (err, balance) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(balance);
            });
        });
    });

    router.get('/v1/feelevels/:network', function (req, res) {
        const opts = {};
        if (req.params['network']) {
            opts.network = req.params['network'];
        }
        try {
            getServer(req, res, function (server) {
                server.getFeeLevels(opts, function (err, feeLevels) {
                    if (err) {
                        return returnError(err, res, req);
                    }
                    res.json(feeLevels);
                });
            });
        } catch (ex) {
            return returnError(ex, res, req);
        }
    });

    router.get('/v1/sendmaxinfo/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const q = req.query;
            const opts = {};
            if (q.feePerKb) {
                opts.feePerKb = +q.feePerKb;
            }
            if (q.feeLevel) {
                opts.feeLevel = q.feeLevel;
            }
            if (q.excludeUnconfirmedUtxos == '1') {
                opts.excludeUnconfirmedUtxos = true;
            }
            if (q.returnInputs == '1') {
                opts.returnInputs = true;
            }
            server.getSendMaxInfo(opts, function (err, info) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(info);
            });
        });
    });

    router.get('/v1/utxos/', function (req, res) {
        const opts = {};
        const addresses = req.query.addresses;
        if (addresses && lodash.isString(addresses)) {
            opts.addresses = req.query.addresses.split(',');
        }
        getServerWithAuth(req, res, function (server) {
            server.getUtxos(opts, function (err, utxos) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(utxos);
            });
        });
    });

    router.post('/v1/broadcast_raw/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.broadcastRawTx(req.body, function (err, txid) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txid);
                res.end();
            });
        });
    });

    router.post('/v1/txproposals/:id/signatures/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            req.body.txProposalId = req.params['id'];
            server.signTx(req.body, function (err, txp) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txp.toObject());
                res.end();
            });
        });
    });

    router.post('/v1/txproposals/:id/publish/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            req.body.txProposalId = req.params['id'];
            server.publishTx(req.body, function (err, txp) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txp.toObject());
                res.end();
            });
        });
    });

    // TODO Check HTTP verb and URL name
    router.post('/v1/txproposals/:id/broadcast/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            req.body.txProposalId = req.params['id'];
            server.broadcastTx(req.body, function (err, txp) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txp.toObject());
                res.end();
            });
        });
    });

    router.post('/v1/txproposals/:id/rejections', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            req.body.txProposalId = req.params['id'];
            server.rejectTx(req.body, function (err, txp) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txp.toObject());
                res.end();
            });
        });
    });

    router.delete('/v1/txproposals/:id/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            req.body.txProposalId = req.params['id'];
            server.removePendingTx(req.body, function (err) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json({
                    success: true
                });
                res.end();
            });
        });
    });

    router.get('/v1/txproposals/:id/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            req.body.txProposalId = req.params['id'];
            server.getTx(req.body, function (err, tx) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(tx.toObject());
                res.end();
            });
        });
    });

    router.get('/v1/txhistory/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {};
            if (req.query.skip) {
                opts.skip = +req.query.skip;
            }
            if (req.query.limit) {
                opts.limit = +req.query.limit;
            }
            if (req.query.includeExtendedInfo == '1') {
                opts.includeExtendedInfo = true;
            }

            server.getTxHistory(opts, function (err, txs) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(txs);
                res.end();
            });
        });
    });

    router.post('/v1/addresses/scan/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.startScan(req.body, function (err, started) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(started);
                res.end();
            });
        });
    });

    router.get('/v1/stats/', function (req, res) {
        const opts = {};
        if (req.query.network) {
            opts.networkName = req.query.network;
        }
        if (req.query.from) {
            opts.from = req.query.from;
        }
        if (req.query.to) {
            opts.to = req.query.to;
        }

        const stats = new Stats(opts);
        stats.run(function (err, data) {
            if (err) {
                return returnError(err, res, req);
            }
            res.json(data);
            res.end();
        });
    });

    router.get('/v1/version/', function (req, res) {
        try {
            resolveService(req, res, function (Service) {
                res.json({
                    serviceVersion: Service.Server.getServiceVersion()
                });
                res.end();
            });
        } catch (ex) {
            return returnError(ex, res, req);
        }
    });

    router.post('/v1/login/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.login({}, function (err, session) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(session);
            });
        });
    });

    router.post('/v1/logout/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.logout({}, function (err) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.end();
            });
        });
    });

    router.get('/v1/notifications/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const timeSpan = req.query.timeSpan ? Math.min(+req.query.timeSpan || 0, Defaults.MAX_NOTIFICATIONS_TIMESPAN) : Defaults.NOTIFICATIONS_TIMESPAN;
            const opts = {
                minTs: +Date.now() - (timeSpan * 1000),
                notificationId: req.query.notificationId,
            };

            server.getNotifications(opts, function (err, notifications) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(notifications);
            });
        }, {
            allowSession: true
        });
    });

    router.get('/v1/txnotes/:txid', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {
                txid: req.params['txid'],
            };
            server.getTxNote(opts, function (err, note) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(note);
            });
        });
    });

    router.put('/v1/txnotes/:txid/', function (req, res) {
        req.body.txid = req.params['txid'];
        getServerWithAuth(req, res, function (server) {
            server.editTxNote(req.body, function (err, note) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(note);
            });
        });
    });

    router.get('/v1/txnotes/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            const opts = {};
            if (lodash.isNumber(+req.query.minTs)) {
                opts.minTs = +req.query.minTs;
            }
            server.getTxNotes(opts, function (err, notes) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(notes);
            });
        });
    });

    router.get('/v1/fiatrates/:code/', function (req, res) {
        const opts = {
            code: req.params['code'],
            provider: req.query.provider,
            ts: +req.query.ts,
        };
        try {
            getServer(req, res, function (server) {
                server.getFiatRate(opts, function (err, rates) {
                    if (err) {
                        return returnError(err, res, req);
                    }
                    res.json(rates);
                });
            });
        } catch (ex) {
            return returnError(ex, res, req);
        }
    });

    router.post('/v1/pushnotifications/subscriptions/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.pushNotificationsSubscribe(req.body, function (err, response) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(response);
            });
        });
    });

    router.delete('/v1/pushnotifications/subscriptions/:token', function (req, res) {
        const opts = {
            token: req.params['token'],
        };
        getServerWithAuth(req, res, function (server) {
            server.pushNotificationsUnsubscribe(opts, function (err, response) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(response);
            });
        });
    });
    router.post('/v1/txconfirmations/', function (req, res) {
        getServerWithAuth(req, res, function (server) {
            server.txConfirmationSubscribe(req.body, function (err, response) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(response);
            });
        });
    });

    router.delete('/v1/txconfirmations/:txid', function (req, res) {
        const opts = {
            txid: req.params['txid'],
        };
        getServerWithAuth(req, res, function (server) {
            server.txConfirmationUnsubscribe(opts, function (err, response) {
                if (err) {
                    return returnError(err, res, req);
                }
                res.json(response);
            });
        });
    });

    self.app.use(self.config.basePath, router);
    return cb();
};

module.exports = ExpressApp;
