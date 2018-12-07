'use strict';

var owsCommon = require('@owstack/ows-common');
var baseConfig = require('../config');
var log = require('npmlog');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;

function BlockchainExplorer(context, opts, config) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.code;
  this.COIN = this.ctx.Networks.coin;

  this.config = config || baseConfig;

  var network = opts.network || this.LIVENET;
  var providers = this.config[this.COIN].blockchainExplorerOpts;
  var provider = opts.provider || providers.defaultProvider;

  $.checkState(providers[provider], 'Provider ' + provider + ' not supported');
  $.checkState(lodash.includes(lodash.keys(providers[provider]), network), 'Network ' + network + ' not supported by this provider');

  var url = this.config[this.COIN].url || providers[provider][network].url;
  var apiPrefix = this.config[this.COIN].apiPrefix || providers[provider][network].apiPrefix;
  var userAgent = this.ctx.Server.getServiceVersion();

  switch (provider) {
    case 'explorer':
      return new this.ctx.Explorer({
        network: network,
        url: url,
        apiPrefix: apiPrefix,
        userAgent: userAgent
      });
    default:
      throw new Error('Provider ' + provider + ' not supported');
  };
};

module.exports = BlockchainExplorer;
