'use strict';

var owsCommon = require('@owstack/ows-common');
var lodash = owsCommon.deps.lodash;

var provider = {
  name: 'OpenWalletStack',
  url: 'http://rates.owstack.org/buy/gdax,bitstamp/btcusd/1',
  parseFn: function(raw) {
    var rates = lodash.compact(lodash.map(raw, function(d) {
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
