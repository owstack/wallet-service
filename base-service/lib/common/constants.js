'use strict';

var Constants = {};

/**
 * Defines the service name that must exist in the 'x-service' request header
 * in order to route the request to the correct service. These values equal the
 * BIP21 protocol name (or equivalent for non-bitcoin networks).
 */
Constants.SERVICE_BITCOIN = 'bitcoin';
Constants.SERVICE_BITCOIN_CASH = 'bitcoincash';
Constants.SERVICE_LITECOIN = 'litecoin';

module.exports = Constants;
