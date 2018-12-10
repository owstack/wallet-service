'use strict';

var Providers = {
  bitpay: require('./bitpay'),
  bitstamp: require('./bitstamp'),
  ows: require('./ows')
}

module.exports = Providers;
