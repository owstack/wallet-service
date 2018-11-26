'use strict';

var owsCommon = require('@owstack/ows-common');
var log = require('npmlog');
var io = require('socket.io-client');
var RequestList = require('./request-list');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;

function Explorer(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.alias;
  this.TESTNET = this.ctx.Networks.testnet.alias;

  $.checkArgument(opts);
  $.checkArgument(lodash.includes([this.LIVENET, this.TESTNET], opts.network));
  $.checkArgument(opts.url);

  this.apiPrefix = opts.apiPrefix || '/explorer-api';
  this.network = opts.network || this.LIVENET;
  this.hosts = opts.url;
  this.userAgent = opts.userAgent || 'ws';
};

var _parseErr = function(err, res) {
  if (err) {
    log.warn('Explorer error: ', err);
    return "Explorer Error";
  }
  log.warn("Explorer " + res.request.href + " Returned Status: " + res.statusCode);
  return "Error querying the blockchain";
};

Explorer.prototype._doRequest = function(args, cb) {
  var opts = {
    hosts: this.hosts,
    headers: {
      'User-Agent': this.userAgent,
    }
  };
  RequestList(lodash.defaults(args, opts), cb);
};

Explorer.prototype.getConnectionInfo = function() {
  return 'Explorer (' + this.network + ') @ ' + this.hosts;
};

/**
 * Retrieve a list of unspent outputs associated with an address or set of addresses
 */
Explorer.prototype.getUtxos = function(addresses, cb) {

  var args = {
    method: 'POST',
    path: this.apiPrefix + '/addrs/utxo',
    json: {
      addrs: lodash.uniq([].concat(addresses)).join(',')
    },
  };

  this._doRequest(args, function(err, res, unspent) {
    if (err || res.statusCode !== 200) return cb(_parseErr(err, res));
    return cb(null, unspent);
  });
};

/**
 * Broadcast a transaction to the bitcoin network
 */
Explorer.prototype.broadcast = function(rawTx, cb) {
  var args = {
    method: 'POST',
    path: this.apiPrefix + '/tx/send',
    json: {
      rawtx: rawTx
    },
  };

  this._doRequest(args, function(err, res, body) {
    if (err || res.statusCode !== 200) return cb(_parseErr(err, res));
    return cb(null, body ? body.txid : null);
  });
};

Explorer.prototype.getTransaction = function(txid, cb) {
  var args = {
    method: 'GET',
    path: this.apiPrefix + '/tx/' + txid,
    json: true,
  };

  this._doRequest(args, function(err, res, tx) {
    if (res && res.statusCode == 404) return cb();
    if (err || res.statusCode !== 200)
      return cb(_parseErr(err, res));

    return cb(null, tx);
  });
};

Explorer.prototype.getTransactions = function(addresses, from, to, cb) {
  var qs = [];
  var total;
  if (lodash.isNumber(from)) qs.push('from=' + from);
  if (lodash.isNumber(to)) qs.push('to=' + to);

  // Trim output
  qs.push('noAsm=1');
  qs.push('noScriptSig=1');
  qs.push('noSpent=1');

  var args = {
    method: 'POST',
    path: this.apiPrefix + '/addrs/txs' + (qs.length > 0 ? '?' + qs.join('&') : ''),
    json: {
      addrs: lodash.uniq([].concat(addresses)).join(',')
    },
    timeout: 120000,
  };

  this._doRequest(args, function(err, res, txs) {
    if (err || res.statusCode !== 200) return cb(_parseErr(err, res));

    if (lodash.isObject(txs)) {
      if (txs.totalItems)
        total = txs.totalItems;

      if (txs.items)
        txs = txs.items;
    }

    // NOTE: Whenever Explorer breaks communication with bitcoind, it returns invalid data but no error code.
    if (!lodash.isArray(txs) || (txs.length != lodash.compact(txs).length)) return cb(new Error('Could not retrieve transactions from blockchain. Request was:' + JSON.stringify(args)));

    return cb(null, txs, total);
  });
};

Explorer.prototype.getAddressActivity = function(address, cb) {
  var self = this;

  var args = {
    method: 'GET',
    path: self.apiPrefix + '/addr/' + address,
    json: true,
  };

  this._doRequest(args, function(err, res, result) {
    if (res && res.statusCode == 404) return cb();
    if (err || res.statusCode !== 200)
      return cb(_parseErr(err, res));

    var nbTxs = result.unconfirmedTxApperances + result.txApperances;
    return cb(null, nbTxs > 0);
  });
};

Explorer.prototype.estimateFee = function(nbBlocks, cb) {
  var path = this.apiPrefix + '/utils/estimatefee';
  if (nbBlocks) {
    path += '?nbBlocks=' + [].concat(nbBlocks).join(',');
  }

  var args = {
    method: 'GET',
    path: path,
    json: true,
  };
  this._doRequest(args, function(err, res, body) {
    if (err || res.statusCode !== 200) return cb(_parseErr(err, res));
    return cb(null, body);
  });
};

Explorer.prototype.getBlockchainHeight = function(cb) {
  var path = this.apiPrefix + '/sync';

  var args = {
    method: 'GET',
    path: path,
    json: true,
  };
  this._doRequest(args, function(err, res, body) {
    if (err || res.statusCode !== 200) return cb(_parseErr(err, res));
    return cb(null, body.blockChainHeight);
  });
};

Explorer.prototype.getTxidsInBlock = function(blockHash, cb) {
  var self = this;

  var args = {
    method: 'GET',
    path: this.apiPrefix + '/block/' + blockHash,
    json: true,
  };

  this._doRequest(args, function(err, res, body) {
    if (err || res.statusCode !== 200) return cb(_parseErr(err, res));
    return cb(null, body.tx);
  });
};

Explorer.prototype.initSocket = function() {

  // sockets always use the first server on the pull
  var socket = io.connect(lodash.head([].concat(this.hosts)), {
    'reconnection': true,
  });
  return socket;
};

module.exports = Explorer;
