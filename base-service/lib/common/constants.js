'use strict';

var Constants = {};

/**
 * Defines the service name that must exist in the 'x-service' request header
 * in order to route the request to the correct service.
 */
Constants.SERVICE_BITCOIN = 'bitcoin';
Constants.SERVICE_BITCOIN_CASH = 'bitcoin cash';
Constants.SERVICE_LITECOIN = 'litecoin';

module.exports = Constants;
