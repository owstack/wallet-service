const chai = require('chai');
const sinon = require('sinon');
const should = chai.should();

const Service = require('../../');

const Services = {
    BCH: Service.BCH.WalletService,
    BTC: Service.BTC.WalletService,
    LTC: Service.LTC.WalletService
};

const owsCommon = require('@owstack/ows-common');
const btcLib = require('@owstack/btc-lib');
const keyLib = require('@owstack/key-lib');
const async = require('async');
const Constants = owsCommon.Constants;
const ECDSA = keyLib.crypto.ECDSA;
const Hash = owsCommon.Hash;
const HDPrivateKey = keyLib.HDPrivateKey;
const HDPublicKey = keyLib.HDPublicKey;
const log = require('npmlog');
const PrivateKey = keyLib.PrivateKey;
const testConfig = require('config');
const TestData = require('../testdata');
const tingodb = require('tingodb')({memStore: true});
const Unit = btcLib.Unit;
const lodash = owsCommon.deps.lodash;

const atomicsAccessor = Unit().atomicsAccessor();
const storage = {};
const blockchainExplorer = {};
const useMongoDb = !!process.env.USE_MONGO_DB;
const helpers = {};

log.debug = log.verbose;

helpers.CLIENT_VERSION = 'bwc-2.0.0';

helpers.before = function (serviceName, cb) {
    function getDb(cb) {
        if (useMongoDb) {
            const mongodb = require('mongodb');
            mongodb.MongoClient.connect('mongodb://localhost:27017/ws_test', function (err, db) {
                if (err) {
                    throw err;
                }
                return cb(db);
            });
        } else {
            const db = new tingodb.Db('./db/test', {});
            return cb(db);
        }
    }
    getDb(function (db) {
        storage[serviceName] = new Services[serviceName].Storage(null, {
            db: db
        });
        return cb();
    });
};

helpers.beforeEach = function (serviceName, cb) {
    if (!storage[serviceName].opts.db) {
        return cb('Error - no storage for test');
    }
    storage[serviceName].opts.db.dropDatabase(function (err) {
        if (err) {
            return cb(err);
        }
        blockchainExplorer[serviceName] = sinon.stub();

        cb(null, {
            blockchainExplorer: helpers.getBlockchainExplorer(serviceName),
            request: sinon.stub(),
            storage: helpers.getStorage(serviceName)
        });
    });
};

helpers.after = function (server, cb) {
    server.shutDown(cb);
};

helpers.getBlockchainExplorer = function (serviceName) {
    return blockchainExplorer[serviceName];
};

helpers._getServiceName = function (server) {
    return server.getServiceInfo().currency;
};

helpers.getStorage = function (serviceName) {
    return storage[serviceName];
};

helpers.signMessage = function (serviceName, text, privKey) {
    const priv = new PrivateKey(privKey);
    const hash = Services[serviceName].Common.Utils.hashMessage(text);
    return ECDSA.sign(hash, priv, 'little').toString();
};

helpers.signRequestPubKey = function (serviceName, requestPubKey, xPrivKey) {
    const priv = new HDPrivateKey(xPrivKey).deriveChild(Constants.PATHS.REQUEST_KEY_AUTH).privateKey;
    return helpers.signMessage(serviceName, requestPubKey, priv);
};

helpers.getAuthServer = function (serviceName, copayerId, cb) {
    const Server = Services[serviceName].Server;

    const verifyStub = sinon.stub(Server.prototype, '_verifySignature');
    verifyStub.returns(true);

    const opts = {
        blockchainExplorer: helpers.getBlockchainExplorer(serviceName),
        request: sinon.stub(),
        storage: helpers.getStorage(serviceName),
        force: true
    };

    Server.getInstanceWithAuth(opts, testConfig, {
        copayerId: copayerId,
        message: 'dummy',
        signature: 'dummy'
    }, function (err, server) {
        verifyStub.restore();
        if (err || !server) {
            throw new Error(`Could not login as copayerId ${  copayerId  } err: ${  err}`);
        }
        return cb(server);
    });
};

// helpers._generateCopayersTestData = function (n) {
//     console.log('var copayers = [');
//     lodash.each(lodash.range(n), function (c) {
//         const xpriv = new HDPrivateKey();
//         const xpub = HDPublicKey(xpriv);
//
//         const xpriv_45H = xpriv.deriveChild(45, true);
//         const xpub_45H = HDPublicKey(xpriv_45H);
//         const id45 = Copayer._xPubToCopayerId(xpub_45H.toString());
//
//         const xpriv_44H_0H_0H = xpriv.deriveChild(44, true).deriveChild(0, true).deriveChild(0, true);
//         const xpub_44H_0H_0H = HDPublicKey(xpriv_44H_0H_0H);
//         const id44 = Copayer._xPubToCopayerId(xpub_44H_0H_0H.toString());
//
//         const xpriv_1H = xpriv.deriveChild(1, true);
//         const xpub_1H = HDPublicKey(xpriv_1H);
//         const priv = xpriv_1H.deriveChild(0).privateKey;
//         const pub = xpub_1H.deriveChild(0).publicKey;
//
//         console.log('{id44: ', `'${  id44  }',`);
//         console.log('id45: ', `'${  id45  }',`);
//         console.log('xPrivKey: ', `'${  xpriv.toString()  }',`);
//         console.log('xPubKey: ', `'${  xpub.toString()  }',`);
//         console.log('xPrivKey_45H: ', `'${  xpriv_45H.toString()  }',`);
//         console.log('xPubKey_45H: ', `'${  xpub_45H.toString()  }',`);
//         console.log('xPrivKey_44H_0H_0H: ', `'${  xpriv_44H_0H_0H.toString()  }',`);
//         console.log('xPubKey_44H_0H_0H: ', `'${  xpub_44H_0H_0H.toString()  }',`);
//         console.log('xPrivKey_1H: ', `'${  xpriv_1H.toString()  }',`);
//         console.log('xPubKey_1H: ', `'${  xpub_1H.toString()  }',`);
//         console.log('privKey_1H_0: ', `'${  priv.toString()  }',`);
//         console.log('pubKey_1H_0: ', `'${  pub.toString()  }'},`);
//     });
//     console.log('];');
// };

helpers.getSignedCopayerOpts = function (serviceName, opts) {
    const Server = Services[serviceName].Server;

    const hash = Server._getCopayerHash(opts.name, opts.xPubKey, opts.requestPubKey);
    opts.copayerSignature = helpers.signMessage(serviceName, hash, TestData.keyPair.priv);
    return opts;
};

helpers.createAndJoinWallet = function (serviceName, m, n, opts, cb) {
    const Server = Services[serviceName].Server;

    if (lodash.isFunction(opts)) {
        cb = opts;
        opts = {};
    }
    opts = opts || {};

    const serverOpts = {
        blockchainExplorer: helpers.getBlockchainExplorer(serviceName),
        storage: helpers.getStorage(serviceName),
        request: sinon.stub(),
        force: true
    };

    new Server(serverOpts, testConfig, function (server) {
        const copayerIds = [];
        const offset = opts.offset || 0;

        const walletOpts = {
            name: 'a wallet',
            m: m,
            n: n,
            pubKey: TestData.keyPair.pub,
            singleAddress: !!opts.singleAddress
        };

        if (lodash.isBoolean(opts.supportBIP44AndP2PKH)) {
            walletOpts.supportBIP44AndP2PKH = opts.supportBIP44AndP2PKH;
        }

        server.createWallet(walletOpts, function (err, walletId) {
            if (err) {
                return cb(err);
            }

            async.each(lodash.range(n), function (i, cb) {
                const copayerData = TestData.copayers[i + offset];
                const copayerOpts = helpers.getSignedCopayerOpts(serviceName, {
                    walletId: walletId,
                    name: `copayer ${  i + 1}`,
                    xPubKey: (lodash.isBoolean(opts.supportBIP44AndP2PKH) && !opts.supportBIP44AndP2PKH) ? copayerData.xPubKey_45H : copayerData.xPubKey_44H_0H_0H,
                    requestPubKey: copayerData.pubKey_1H_0,
                    customData: `custom data ${  i + 1}`,
                });

                if (lodash.isBoolean(opts.supportBIP44AndP2PKH)) {
                    copayerOpts.supportBIP44AndP2PKH = opts.supportBIP44AndP2PKH;
                }

                server.joinWallet(copayerOpts, function (err, result) {
                    should.not.exist(err);
                    copayerIds.push(result.copayerId);
                    return cb(err);
                });
            }, function (err) {
                if (err) {
                    return cb('Could not generate wallet');
                }

                helpers.getAuthServer(serviceName, copayerIds[0], function (s) {
                    s.getWallet({}, function (err, w) {
                        cb(s, w);
                    });
                });
            });

        });
    });
};

helpers.randomTXID = function () {
    return Hash.sha256(Buffer.from(`${Math.random() * 100000  }`)).toString('hex');
};

helpers.toAtomic = function (serviceName, standards) {
    if (lodash.isArray(standards)) {
        return lodash.map(standards, helpers.toAtomic);
    } else {
        return Services[serviceName].Common.Utils.strip(Unit.fromStandardUnit(standards).toAtomicUnit());
    }
};

helpers._parseAmount = function (serviceName, str) {
    const result = {
        amount: +0,
        confirmations: lodash.random(6, 100),
    };

    if (lodash.isNumber(str)) {
        str = str.toString();
    }

    const re = /^((?:\d+c)|u)?\s*([\d.]+)\s*(BTC|bit|satoshi)?$/;
    const match = str.match(re);

    if (!match) {
        throw new Error(`Could not parse amount ${  str}`);
    }

    if (match[1]) {
        if (match[1] == 'u') {
            result.confirmations = 0;
        }
        if (lodash.endsWith(match[1], 'c')) {
            result.confirmations = +match[1].slice(0, -1);
        }
    }

    switch (match[3]) {
        default:
        case 'BTC':
            result.amount = Services[serviceName].Common.Utils.strip(+match[2] * 1e8);
            break;
        case 'bit':
            result.amount = Services[serviceName].Common.Utils.strip(+match[2] * 1e2);
            break;
        case 'satoshi':
            result.amount = Services[serviceName].Common.Utils.strip(+match[2]);
            break;
    }

    return result;
};

helpers.stubUtxos = function (server, wallet, amounts, opts, cb) {
    const serviceName = helpers._getServiceName(server);

    if (lodash.isFunction(opts)) {
        cb = opts;
        opts = {};
    }
    opts = opts || {};

    if (!helpers._utxos) {
        helpers._utxos = {};
    }

    async.waterfall([

        function (next) {
            if (opts.addresses) {
                return next(null, [].concat(opts.addresses));
            }
            async.mapSeries(lodash.range(0, amounts.length > 2 ? 2 : 1), function (i, next) {
                server.createAddress({}, next);
            }, next);
        },
        function (addresses, next) {
            addresses.should.not.be.empty;

            const utxos = lodash.compact(lodash.map([].concat(amounts), function (amount, i) {
                const parsed = helpers._parseAmount(serviceName, amount);

                if (parsed.amount <= 0) {
                    return null;
                }

                const address = addresses[i % addresses.length];

                let scriptPubKey;
                switch (wallet.addressType) {
                    case Constants.SCRIPT_TYPES.P2SH:
                        scriptPubKey = btcLib.Script.buildMultisigOut(address.publicKeys, wallet.m).toScriptHashOut();
                        break;
                    case Constants.SCRIPT_TYPES.P2PKH:
                        scriptPubKey = btcLib.Script.buildPublicKeyHashOut(address.address);
                        break;
                }
                should.exist(scriptPubKey);

                const res = {
                    txid: helpers.randomTXID(),
                    vout: lodash.random(0, 10),
                    scriptPubKey: scriptPubKey.toBuffer().toString('hex'),
                    address: address.address,
                    confirmations: parsed.confirmations,
                    publicKeys: address.publicKeys,
                };
                res[atomicsAccessor] = parsed.amount;
                return res;
            }));

            if (opts.keepUtxos) {
                helpers._utxos = helpers._utxos.concat(utxos);
            } else {
                helpers._utxos = utxos;
            }

            helpers.getBlockchainExplorer(serviceName).getUtxos = function (addresses, cb) {
                const selected = lodash.filter(helpers._utxos, function (utxo) {
                    return lodash.includes(addresses, utxo.address);
                });
                return cb(null, selected);
            };

            return next();
        },
    ], function (err) {
        should.not.exist(err);
        return cb(helpers._utxos);
    });
};

helpers.stubBroadcast = function (serviceName, thirdPartyBroadcast) {
    helpers.getBlockchainExplorer(serviceName).broadcast = sinon.stub().callsArgWith(1, null, '112233');
    helpers.getBlockchainExplorer(serviceName).getTransaction = sinon.stub().callsArgWith(1, null, null);
};

helpers.stubHistory = function (serviceName, txs) {
    const totalItems = txs.length;
    helpers.getBlockchainExplorer(serviceName).getTransactions = function (addresses, from, to, cb) {
        const MAX_BATCH_SIZE = 100;
        const nbTxs = txs.length;

        if (lodash.isUndefined(from) && lodash.isUndefined(to)) {
            from = 0;
            to = MAX_BATCH_SIZE;
        }
        if (!lodash.isUndefined(from) && lodash.isUndefined(to)) {
            to = from + MAX_BATCH_SIZE;
        }

        if (!lodash.isUndefined(from) && !lodash.isUndefined(to) && to - from > MAX_BATCH_SIZE) {
            to = from + MAX_BATCH_SIZE;
        }

        if (from < 0) {
            from = 0;
        }
        if (to < 0) {
            to = 0;
        }
        if (from > nbTxs) {
            from = nbTxs;
        }
        if (to > nbTxs) {
            to = nbTxs;
        }

        const page = txs.slice(from, to);
        return cb(null, page, totalItems);
    };
};

helpers.stubFeeLevels = function (serviceName, levels) {
    helpers.getBlockchainExplorer(serviceName).estimateFee = function (nbBlocks, cb) {
        const result = lodash.fromPairs(lodash.map(lodash.pick(levels, nbBlocks), function (fee, n) {
            return [+n, fee > 0 ? fee / 1e8 : fee];
        }));
        return cb(null, result);
    };
};

helpers.stubAddressActivity = function (serviceName, activeAddresses) {
    helpers.getBlockchainExplorer(serviceName).getAddressActivity = function (address, cb) {
        return cb(null, lodash.includes(activeAddresses, address));
    };
};

helpers.clientSign = function (txp, derivedXPrivKey) {
    //Derive proper key to sign, for each input
    const privs = [];
    const derived = {};

    const xpriv = new HDPrivateKey(derivedXPrivKey, txp.networkName);
    lodash.each(txp.inputs, function (i) {
        if (!derived[i.path]) {
            derived[i.path] = xpriv.deriveChild(i.path).privateKey;
            privs.push(derived[i.path]);
        }
    });

    const t = txp.getTx();

    let signatures = lodash.map(privs, function (priv, i) {
        return t.getSignatures(priv);
    });

    signatures = lodash.map(lodash.sortBy(lodash.flatten(signatures), 'inputIndex'), function (s) {
        return s.signature.toDER().toString('hex');
    });

    return signatures;
};

helpers.getProposalSignatureOpts = function (serviceName, txp, signingKey) {
    const raw = txp.getRawTx();
    const proposalSignature = helpers.signMessage(serviceName, raw, signingKey);

    return {
        txProposalId: txp.id,
        proposalSignature: proposalSignature,
    };
};

helpers.createAddresses = function (server, wallet, main, change, cb) {
    // var clock = sinon.useFakeTimers('Date');
    async.mapSeries(lodash.range(main + change), function (i, next) {
    // clock.tick(1000);
        const address = wallet.createAddress(i >= main);
        server.getStorage().storeAddressAndWallet(wallet, address, function (err) {
            next(err, address);
        });
    }, function (err, addresses) {
        should.not.exist(err);
        // clock.restore();
        return cb(lodash.take(addresses, main), lodash.takeRight(addresses, change));
    });
};

helpers.createAndPublishTx = function (server, txOpts, signingKey, cb) {
    const serviceName = helpers._getServiceName(server);
    server.createTx(txOpts, function (err, txp) {
        const publishOpts = helpers.getProposalSignatureOpts(serviceName, txp, signingKey);
        server.publishTx(publishOpts, function (err) {
            should.not.exist(err);
            return cb(txp);
        });
    });
};

helpers.historyCacheTest = function (items) {
    const template = {
        txid: 'fad88682ccd2ff34cac6f7355fe9ecd8addd9ef167e3788455972010e0d9d0de',
        vin: [{
            txid: '0279ef7b21630f859deb723e28beac9e7011660bd1346c2da40321d2f7e34f04',
            vout: 0,
            n: 0,
            addr: '2NAVFnsHqy5JvqDJydbHPx393LFqFFBQ89V',
            valueAtomic: 45753,
            value: 0.00045753,
        }],
        vout: [{
            value: '0.00011454',
            n: 0,
            scriptPubKey: {
                addresses: [
                    '2N7GT7XaN637eBFMmeczton2aZz5rfRdZso'
                ]
            }
        }, {
            value: '0.00020000',
            n: 1,
            scriptPubKey: {
                addresses: [
                    'mq4D3Va5mYHohMEHrgHNGzCjKhBKvuEhPE'
                ]
            }
        }],
        confirmations: 1,
        blockheight: 423499,
        time: 1424472242,
        blocktime: 1424472242,
        valueOut: 0.00031454,
        valueIn: 0.00045753,
        fees: 0.00014299
    };

    const ret = [];
    lodash.each(lodash.range(0, items), function (i) {
        const t = lodash.clone(template);
        t.txid = `txid:${  i}`;
        t.confirmations = items - i - 1;
        t.blockheight = i;
        t.time = t.blocktime = i;
        ret.unshift(t);
    });

    return ret;
};

module.exports = helpers;
