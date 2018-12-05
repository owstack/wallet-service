'use strict';

var Constants = {};

/**
 * Defines the service name that must exist in the 'x-service' request header
 * in order to route the request to the correct service.
 */
Constants.SERVICE_BITCOIN = 'BTC';
Constants.SERVICE_BITCOIN_CASH = 'BCH';
Constants.SERVICE_LITECOIN = 'LTC';

module.exports = Constants;
