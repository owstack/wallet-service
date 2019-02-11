'use strict';

var Constants = {};

/**
 * Defines the service name that must exist as a 'service' request parameter
 * in order to route the request to the correct service.
 */
Constants.SERVICE_BITCOIN = 'btc';
Constants.SERVICE_BITCOIN_CASH = 'bch';
Constants.SERVICE_LITECOIN = 'ltc';

module.exports = Constants;
