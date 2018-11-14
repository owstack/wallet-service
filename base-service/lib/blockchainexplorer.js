'use strict';

var owsCommon = require('@owstack/ows-common');
var config = require('../config');
var Constants = require('./common/constants');
var Explorer = require('./blockchainexplorers/explorer');
var log = require('npmlog');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;
var providers = config.blockchainExplorerOpts;

function BlockchainExplorer(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.code;

  $.checkArgument(opts);

  var network = opts.network || this.LIVENET;
  var provider = opts.provider || config.blockchainExplorerOpts.defaultProvider;

  $.checkState(providers[provider], 'Provider ' + provider + ' not supported');
  $.checkState(lodash.includes(lodash.keys(providers[provider]), network), 'Network ' + network + ' not supported by this provider');

  var url = opts.url || providers[provider][network].url;
  var apiPrefix = opts.apiPrefix || providers[provider][network].apiPrefix;

  switch (provider) {
    case 'explorer':
      return new Explorer({
        network: network,
        url: url,
        apiPrefix: apiPrefix,
        userAgent: opts.userAgent,
      });
    default:
      throw new Error('Provider ' + provider + ' not supported');
  };
};

module.exports = BlockchainExplorer;
