'use strict';

var Defaults = {};

/**
 * Notififications.
 * Max allowed timespan for notification queries in seconds.
 */
Defaults.MAX_NOTIFICATIONS_TIMESPAN = 60 * 60 * 24 * 14; // ~ 2 weeks
Defaults.NOTIFICATIONS_TIMESPAN = 60;

/**
 *  API Rate Limiter.
 */
Defaults.RateLimit = {
  createWallet: {
    windowMs: 60 * 60 * 1000, // hour window 
    delayAfter: 10, // begin slowing down responses after the 3rd request 
    delayMs: 3000, // slow down subsequent responses by 3 seconds per request 
    max: 20, // start blocking after 20 request
    message: "Too many wallets created from this IP, please try again after an hour"
  },
  // otherPosts: {
  //   windowMs: 60 * 60 * 1000, // 1 hour window 
  //   max: 1200 , // 1 post every 3 sec average, max.
  // },
};

/**
 * Fiat Rate Service.
 */
Defaults.FIAT_RATE_PROVIDER = 'OpenWalletStack';
Defaults.FIAT_RATE_FETCH_INTERVAL = 10; // In minutes
Defaults.FIAT_RATE_MAX_LOOK_BACK_TIME = 120; // In minutes

module.exports = Defaults;
