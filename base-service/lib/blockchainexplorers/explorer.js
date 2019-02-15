const owsCommon = require('@owstack/ows-common');
const log = require('npmlog');
const io = require('socket.io-client');
const RequestList = require('./request-list');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

log.debug = log.verbose;

class Explorer {
    constructor(context, opts) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
        context.inject(this);

        // Set some frequently used contant values based on context.
        this.LIVENET = this.ctx.Networks.livenet;
        this.TESTNET = this.ctx.Networks.testnet;

        $.checkArgument(opts);
        $.checkArgument(lodash.includes([this.LIVENET.name, this.TESTNET.name], opts.networkName));
        $.checkArgument(opts.url);

        this.apiPrefix = opts.apiPrefix || '/explorer-api';
        this.networkName = opts.networkName || this.LIVENET.name;
        this.hosts = opts.url;
        this.userAgent = opts.userAgent || 'ws';
    }
}

const _parseErr = function (err, res) {
    if (err) {
        log.warn('Explorer error: ', err);
        return 'Explorer Error';
    }
    log.warn(`Explorer ${  res.request.href  } Returned Status: ${  res.statusCode}`);
    return 'Error querying the blockchain';
};

Explorer.prototype._doRequest = function (args, cb) {
    const opts = {
        hosts: this.hosts,
        headers: {
            'User-Agent': this.userAgent,
        }
    };
    new RequestList(lodash.defaults(args, opts), cb);
};

Explorer.prototype.getConnectionInfo = function () {
    return `Explorer (${  this.networkName  }) @ ${  this.hosts}`;
};

/**
 * Retrieve a list of unspent outputs associated with an address or set of addresses
 */
Explorer.prototype.getUtxos = function (addresses, cb) {
    const args = {
        method: 'POST',
        path: `${this.apiPrefix  }/addrs/utxo`,
        json: {
            addrs: lodash.uniq([].concat(addresses)).join(',')
        },
    };

    this._doRequest(args, function (err, res, unspent) {
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }
        return cb(null, unspent);
    });
};

/**
 * Broadcast a transaction to the network
 */
Explorer.prototype.broadcast = function (rawTx, cb) {
    const args = {
        method: 'POST',
        path: `${this.apiPrefix  }/tx/send`,
        json: {
            rawtx: rawTx
        },
    };

    this._doRequest(args, function (err, res, body) {
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }
        return cb(null, body ? body.txid : null);
    });
};

Explorer.prototype.getTransaction = function (txid, cb) {
    const args = {
        method: 'GET',
        path: `${this.apiPrefix  }/tx/${  txid}`,
        json: true,
    };

    this._doRequest(args, function (err, res, tx) {
        if (res && res.statusCode == 404) {
            return cb();
        }
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }

        return cb(null, tx);
    });
};

Explorer.prototype.getTransactions = function (addresses, from, to, cb) {
    const qs = [];
    let total;
    if (lodash.isNumber(from)) {
        qs.push(`from=${  from}`);
    }
    if (lodash.isNumber(to)) {
        qs.push(`to=${  to}`);
    }

    // Trim output
    qs.push('noAsm=1');
    qs.push('noScriptSig=1');
    qs.push('noSpent=1');

    const args = {
        method: 'POST',
        path: `${this.apiPrefix  }/addrs/txs${  qs.length > 0 ? `?${  qs.join('&')}` : ''}`,
        json: {
            addrs: lodash.uniq([].concat(addresses)).join(',')
        },
        timeout: 120000,
    };

    this._doRequest(args, function (err, res, txs) {
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }

        if (lodash.isObject(txs)) {
            if (txs.totalItems) {
                total = txs.totalItems;
            }

            if (txs.items) {
                txs = txs.items;
            }
        }

        // NOTE: When Explorer breaks communication with the full-node, it returns invalid data but no error code.
        if (!lodash.isArray(txs) || (txs.length != lodash.compact(txs).length)) {
            return cb(new Error(`Could not retrieve transactions from blockchain. Request was:${  JSON.stringify(args)}`));
        }

        return cb(null, txs, total);
    });
};

Explorer.prototype.getAddressActivity = function (address, cb) {
    const self = this;

    const args = {
        method: 'GET',
        path: `${self.apiPrefix  }/addr/${  address}`,
        json: true,
    };

    this._doRequest(args, function (err, res, result) {
        if (res && res.statusCode == 404) {
            return cb();
        }
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }

        const nbTxs = result.unconfirmedTxApperances + result.txApperances;
        return cb(null, nbTxs > 0);
    });
};

Explorer.prototype.estimateFee = function (nbBlocks, cb) {
    let path = `${this.apiPrefix  }/utils/estimatefee`;
    if (nbBlocks) {
        path += `?nbBlocks=${  [].concat(nbBlocks).join(',')}`;
    }

    const args = {
        method: 'GET',
        path: path,
        json: true,
    };
    this._doRequest(args, function (err, res, body) {
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }
        return cb(null, body);
    });
};

Explorer.prototype.getBlockchainHeight = function (cb) {
    const path = `${this.apiPrefix  }/sync`;

    const args = {
        method: 'GET',
        path: path,
        json: true,
    };
    this._doRequest(args, function (err, res, body) {
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }
        return cb(null, body.blockChainHeight);
    });
};

Explorer.prototype.getTxidsInBlock = function (blockHash, cb) {
    const args = {
        method: 'GET',
        path: `${this.apiPrefix  }/block/${  blockHash}`,
        json: true,
    };

    this._doRequest(args, function (err, res, body) {
        if (err || res.statusCode !== 200) {
            return cb(_parseErr(err, res));
        }
        return cb(null, body.tx);
    });
};

Explorer.prototype.initSocket = function () {
    // sockets always use the first server on the pull
    const socket = io.connect(lodash.head([].concat(this.hosts)), {
        reconnection: true,
    });
    return socket;
};

module.exports = Explorer;
