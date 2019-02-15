const owsCommon = require('@owstack/ows-common');
const baseConfig = require('config');
const log = require('npmlog');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

log.debug = log.verbose;

class BlockchainExplorer {
    constructor(context, opts, config) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
        context.inject(this);

        // Set some frequently used contant values based on context.
        this.LIVENET = this.ctx.Networks.livenet;

        this.config = config || baseConfig;

        const networkName = opts.networkName || this.LIVENET.name;
        const network = this.ctx.Networks.get(networkName);

        const providers = this.config[network.currency].blockchainExplorerOpts;
        const provider = opts.provider || providers.defaultProvider;

        $.checkState(providers[provider], `Provider ${  provider  } not supported`);
        $.checkState(lodash.includes(lodash.keys(providers[provider]), network.alias), `Network ${  network.alias  } not supported by this provider`);

        const url = this.config[network.currency].url || providers[provider][network.alias].url;
        const apiPrefix = this.config[network.currency].apiPrefix || providers[provider][network.alias].apiPrefix;

        switch (provider) {
            case 'explorer':
                return new this.ctx.Explorer({
                    networkName: networkName,
                    url: url,
                    apiPrefix: apiPrefix,
                    userAgent: opts.userAgent
                });
            default:
                throw new Error(`Provider ${  provider  } not supported`);
        }
    }
}

module.exports = BlockchainExplorer;
