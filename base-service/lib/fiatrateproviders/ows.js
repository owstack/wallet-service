const owsCommon = require('@owstack/ows-common');
const lodash = owsCommon.deps.lodash;

function parseFn(raw) {
    const rates = lodash.compact(lodash.map(raw, function (d) {
        if (!d.code || !d.rate) {
            return null;
        }
        return {
            code: d.code,
            value: d.rate
        };
    }));
    return rates;
}

const provider = {
    name: 'OpenWalletStack',
    currency: {
        BCH: {
            url: 'http://rates.owstack.org/buy/gdax,bitstamp/bchusd/1',
            parseFn: parseFn
        },
        BTC: {
            url: 'http://rates.owstack.org/buy/gdax,bitstamp/btcusd/1',
            parseFn: parseFn
        },
        LTC: {
            url: 'http://rates.owstack.org/buy/gdax,bitstamp/ltcusd/1',
            parseFn: parseFn
        }
    }
};

module.exports = provider;
