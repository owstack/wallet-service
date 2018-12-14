'use strict';

var async = require('async');
var baseConfig = require('../../config');
var EventEmitter = require('events').EventEmitter;
var ExpressApp = require('../lib/expressapp');
var fs = require('fs');
var https = require('https');
var http = require('http');
var io = require('socket.io');
var Locker = require('locker-server');

/**
 * A Node Service module
 * @param {Object} config - wallet-service configuration.
 * @param {Object} opts - Overriding options for this node.
 * @param {Boolean} opts.https - Enable https for this module, defaults to node settings.
 * @param {Number} opts.lockerPort - Port for locker service.
 * @param {Number} opts.wsPort - Port for wallet-service API.
 * @param {Object} opts.httpsOptions
 * @param {String} opts.httpsOptions.cert - HTTPS certificate file.
 * @param {String} opts.httpsOptions.CAinter1 - An HTTPS intermediate certificate file.
 * @param {String} opts.httpsOptions.CAinter2 - An HTTPS intermediate certificate file.
 * @param {String} opts.httpsOptions.CAroot - A HTTPS root certificate file.
 * @param {String} opts.httpsOptions.key - HTTPS key file.
 */
class Service extends EventEmitter {
  constructor(context, config, opts) {
    super();

    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    this.ctx = context;

    // Set some frequently used contant values based on context.
    this.COIN = this.ctx.Networks.coin;

    EventEmitter.call(this);

    this.config = config || baseConfig;
    this.https = opts.https || this.config.https;
    this.httpsOptions = opts.httpsOptions || this.config.httpsOptions;
    this.wsPort = opts.wsPort || this.config.port;

    if (this.config.messageBrokerOpts) {
      this.messageBrokerPort = this.config.messageBrokerOpts.port;
    }
    this.messageBrokerPort = opts.messageBrokerPort || this.messageBrokerPort || 3380;

    if (this.config.lockOpts) {
      this.lockerPort = this.config.lockOpts.lockerServer.port;
    }
    this.lockerPort = opts.lockerPort || this.lockerPort || 3231;
  }
};

Service.dependencies = ['@owstack/explorer-api'];

/**
 * This method will read `key` and `cert` files from disk based on `httpsOptions` and
 * return `serverOpts` with the read files.
 * @returns {Object}
 */
Service.prototype._readHttpsOptions = function() {
  if (!this.httpsOptions || !this.httpsOptions.key || !this.httpsOptions.cert) {
    throw new Error('Missing https options');
  }

  var serverOpts = {};
  serverOpts.key = fs.readFileSync(this.httpsOptions.key);
  serverOpts.cert = fs.readFileSync(this.httpsOptions.cert);

  // This sets the intermediate CA certs only if they have all been designated in the config.js
  if (this.httpsOptions.CAinter1 && this.httpsOptions.CAinter2 && this.httpsOptions.CAroot) {
    serverOpts.ca = [
      fs.readFileSync(this.httpsOptions.CAinter1),
      fs.readFileSync(this.httpsOptions.CAinter2),
      fs.readFileSync(this.httpsOptions.CAroot)
    ];
  }
  return serverOpts;
};

/**
 * Will start the HTTP web server and socket.io for the wallet service.
 */
Service.prototype._startWalletService = function(config, next) {
  var self = this;
  var expressApp = new ExpressApp(config);

  if (self.https) {
    var serverOpts = self._readHttpsOptions();
    self.server = https.createServer(serverOpts, expressApp.app);
  } else {
    self.server = http.Server(expressApp.app);
  }

  expressApp.start(null, function(err) {
    if (err) {
      return next(err);
    }
    self.server.listen(self.wsPort, next);
  });
};

/**
 * Called by the node to start the service
 */
Service.prototype.start = function(done) {
  var self = this;

  // Locker Server
  var locker = new Locker();
  locker.listen(self.lockerPort);

  // Message Broker
  var messageServer = io(self.messageBrokerPort);
  messageServer.on('connection', function(s) {
    s.on('msg', function(d) {
      messageServer.emit('msg', d);
    });
  });

  async.series([
    function(next) {
      // Blockchain Monitor
      var blockchainMonitor = new self.ctx.BlockchainMonitor(self.config);
      blockchainMonitor.start(null, next);
    },
    function(next) {
      // Email Service
      if (self.config[self.COIN].emailOpts) {
        var emailService = new self.ctx.EmailService(self.config);
        emailService.start(null, next);
      } else {
        setImmediate(next);
      }
    },
    function(next) {
      self._startWalletService(self.config, next);
    }
  ], done);

};

/**
 * Called by node to stop the service
 */
Service.prototype.stop = function(done) {
  setImmediate(function() {
    done();
  });
};

Service.prototype.getAPIMethods = function() {
  return [];
};

Service.prototype.getPublishEvents = function() {
  return [];
};

module.exports = Service;
