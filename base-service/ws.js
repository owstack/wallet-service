#!/usr/bin/env node

var async = require('async');
var baseConfig = require('../config');
var cluster = require('cluster');
var ExpressApp = require('./lib/expressapp');
var fs = require('fs');
var log = require('npmlog');
var os = require('os');

log.debug = log.verbose;
log.disableColor();

var serverModule;

class WS {
  constructor(config) {
    this.config = config || baseConfig;

    serverModule = this.config.https ? require('https') : require('http');
  }
};

WS.prototype.start = function() {
  var self = this;

  var serverOpts = {};

  if (self.config.https) {
    serverOpts.key = fs.readFileSync(self.config.privateKeyFile || './ssl/privatekey.pem');
    serverOpts.cert = fs.readFileSync(self.config.certificateFile || './ssl/certificate.pem');
    if (self.config.ciphers) {
      serverOpts.ciphers = self.config.ciphers;
      serverOpts.honorCipherOrder = true;
    };

    // This sets the intermediate CA certs only if they have all been designated in the config.js
    if (self.config.CAinter1 && self.config.CAinter2 && self.config.CAroot) {
      serverOpts.ca = [fs.readFileSync(self.config.CAinter1),
        fs.readFileSync(self.config.CAinter2),
        fs.readFileSync(self.config.CAroot)
      ];
    };
  }

  if (self.config.cluster && !config.lockOpts.lockerServer) {
    throw 'When running in cluster mode, locker server must be configured';
  }

  if (self.config.cluster && !self.config.messageBrokerOpts.messageBrokerServer) {
    throw 'When running in cluster mode, message broker server must be configured';
  }

  var expressApp = new ExpressApp(self.config);

  function startInstance(cb) {
    var server = self.config.https ? serverModule.createServer(serverOpts, expressApp.app) : serverModule.Server(expressApp.app);

    server.on('connection', function(socket) {
      socket.setTimeout(300 * 1000);
    })

    expressApp.start(function(err) {
      if (err) {
        log.error('Could not start Wallet Service instance', err);
        return;
      }

      server.listen(self.config.port);

      var instanceInfo = cluster.worker ? ' [Instance:' + cluster.worker.id + ']' : '';
      log.info('Wallet Service running ' + instanceInfo);
      return;
    });
  };

  if (self.config.cluster && cluster.isMaster) {
    // Count the machine's CPUs
    var instances = self.config.clusterInstances || os.cpus().length;

    log.info('Starting ' + instances + ' instances');

    // Create a worker for each CPU
    for (var i = 0; i < instances; i += 1) {
      cluster.fork();
    }

    // Listen for dying workers
    cluster.on('exit', function(worker) {
      // Replace the dead worker,
      log.error('Worker ' + worker.id + ' died :(');
      cluster.fork();
    });
    // Code to run if we're in a worker process
  } else {
    log.info('Listening on port: ' + self.config.port);
    startInstance();
  };
};

// Start the service with base configuration (default).
var service = new WS();
service.start();
