const config = require('config');
const owsCommon = require('@owstack/ows-common');
const lodash = owsCommon.deps.lodash;

function parseFn(raw) {
    const rates = lodash.compact(lodash.map(raw, function (d) {
        if (!d.code || !d.rate) {
            return null;
        }
        return {
            code: d.code,
            value: parseFloat(d.rate)
        };
    }));
    return rates;
}

const provider = {
    name: 'OpenWalletStack',
    currency: {
        BCH: {
            url: `${config.rateServiceOpts.url}/buy/gdax,bitstamp/bchusd/1`,
            parseFn: parseFn
        },
        BTC: {
            url: `${config.rateServiceOpts.url}/buy/gdax,bitstamp/btcusd/1`,
            parseFn: parseFn
        },
        LTC: {
            url: `${config.rateServiceOpts.url}/buy/gdax,bitstamp/ltcusd/1`,
            parseFn: parseFn
        }
    }
};

module.exports = provider;
