'use strict';

var owsCommon = require('@owstack/ows-common');
var log = require('npmlog');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;

function BlockchainExplorer(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.alias;

  $.checkArgument(opts);

  var network = opts.network || this.LIVENET;
  var providers = this.ctx.config.blockchainExplorerOpts;
  var provider = opts.provider || providers.defaultProvider;

  $.checkState(providers[provider], 'Provider ' + provider + ' not supported');
  $.checkState(lodash.includes(lodash.keys(providers[provider]), network), 'Network ' + network + ' not supported by this provider');

  var url = opts.url || providers[provider][network].url;
  var apiPrefix = opts.apiPrefix || providers[provider][network].apiPrefix;

  switch (provider) {
    case 'explorer':
      return new this.ctx.Explorer({
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
