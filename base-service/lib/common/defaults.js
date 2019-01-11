'use strict';

var Defaults = {};

// Max allowed timespan for notification queries in seconds.
Defaults.MAX_NOTIFICATIONS_TIMESPAN = 60 * 60 * 24 * 14; // ~2 weeks
Defaults.NOTIFICATIONS_TIMESPAN = 60;

// Fiat Rate Service.
Defaults.FIAT_RATE_PROVIDER = 'OpenWalletStack';
Defaults.FIAT_RATE_FETCH_INTERVAL = 10; // minutes
Defaults.FIAT_RATE_MAX_LOOK_BACK_TIME = 120; // minutes

Defaults.MAX_KEYS = 100;

// Time after which a tx proposal can be erased by any copayer in seconds.
Defaults.DELETE_LOCKTIME = 600;

// Allowed consecutive txp rejections before backoff is applied.
Defaults.BACKOFF_OFFSET = 10;

// Time a copayer needs to wait to create a new tx after her previous proposal was rejected.
Defaults.BACKOFF_TIME = 600; // seconds

Defaults.MAX_MAIN_ADDRESS_GAP = 20;

// TODO: should allow different gap sizes for external/internal chains.
Defaults.SCAN_ADDRESS_GAP = Defaults.MAX_MAIN_ADDRESS_GAP + 20;

// Minimum nb of addresses a wallet must have to start using 2-step balance optimization.
Defaults.TWO_STEP_BALANCE_THRESHOLD = 100;

// Maximum number of tx's returned in a single query.
Defaults.HISTORY_LIMIT = 50;

// Number of addresses from which tx history is enabled in a wallet.
Defaults.HISTORY_CACHE_ADDRESS_THRESOLD = 100;

// Cache time for blockchain height.
Defaults.BLOCKHEIGHT_CACHE_TIME = 10 * 60; // seconds

// API session expiration time.
Defaults.SESSION_EXPIRATION = 1 * 60 * 60; // 1 hour

// API Rate Limiter.
Defaults.RateLimit = {
  createWallet: {
    windowMs: 60 * 60 * 1000, // 1 hour window 
    delayAfter: 10, // begin slowing down responses after the 3rd request 
    delayMs: 3000, // slow down subsequent responses by 3 seconds per request 
    max: 20, // start blocking after 20 request
    message: 'Too many wallets created from this IP, please try again after an hour'
  },
  // otherPosts: {
  //   windowMs: 60 * 60 * 1000, // 1 hour window 
  //   max: 1200 , // 1 post every 3 sec average, max.
  // },
};

module.exports = Defaults;
