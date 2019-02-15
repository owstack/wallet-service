

const owsCommon = require('@owstack/ows-common');
const lodash = owsCommon.deps.lodash;

const provider = {
    name: 'OpenWalletStack',
    url: 'http://rates.owstack.org/buy/gdax,bitstamp/btcusd/1',
    parseFn: function (raw) {
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
    },
};

module.exports = provider;
