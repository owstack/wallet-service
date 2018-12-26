'use strict';

var owsCommon = require('@owstack/ows-common');
var baseConfig = require('../../config');
var log = require('npmlog');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;

class BlockchainExplorer {
  constructor(context, opts, config) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    context.inject(this);

    // Set some frequently used contant values based on context.
    this.LIVENET = this.ctx.Networks.livenet;

    this.config = config || baseConfig;
;
    var networkName = opts.networkName || this.LIVENET.name;
    var network = this.ctx.Networks.get(networkName);

    var providers = this.config[network.currency].blockchainExplorerOpts;
    var provider = opts.provider || providers.defaultProvider;

    $.checkState(providers[provider], 'Provider ' + provider + ' not supported');
    $.checkState(lodash.includes(lodash.keys(providers[provider]), network.alias), 'Network ' + network.alias + ' not supported by this provider');

    var url = this.config[network.currency].url || providers[provider][network.alias].url;
    var apiPrefix = this.config[network.currency].apiPrefix || providers[provider][network.alias].apiPrefix;
    var userAgent = this.ctx.Server.getServiceVersion();

    switch (provider) {
      case 'explorer':
        return new this.ctx.Explorer({
          networkName: networkName,
          url: url,
          apiPrefix: apiPrefix,
          userAgent: userAgent
        });
      default:
        throw new Error('Provider ' + provider + ' not supported');
    };
  }
};

module.exports = BlockchainExplorer;
