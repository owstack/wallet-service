#!/usr/bin/env node

const baseConfig = require('config');
const cluster = require('cluster');
const ExpressApp = require('./lib/expressapp');
const fs = require('fs');
const log = require('npmlog');

log.debug = log.verbose;
log.disableColor();

let serverModule;

class WS {
    constructor(config) {
        this.config = config || baseConfig;
        serverModule = this.config.https ? require('https') : require('http');
    }
}

WS.prototype.start = function (cb) {
    const serverOpts = {};

    if (this.config.https) {
        serverOpts.key = fs.readFileSync(this.config.privateKeyFile || './ssl/privatekey.pem');
        serverOpts.cert = fs.readFileSync(this.config.certificateFile || './ssl/certificate.pem');
        if (this.config.ciphers) {
            serverOpts.ciphers = this.config.ciphers;
            serverOpts.honorCipherOrder = true;
        }

        // This sets the intermediate CA certs only if they have all been designated in the config.js
        if (this.config.CAinter1 && this.config.CAinter2 && this.config.CAroot) {
            serverOpts.ca = [fs.readFileSync(this.config.CAinter1),
                fs.readFileSync(this.config.CAinter2),
                fs.readFileSync(this.config.CAroot)
            ];
        }
    }

    if (this.config.cluster && !this.config.lockOpts.lockerServer) {
        throw 'When running in cluster mode, locker server must be configured';
    }

    if (this.config.cluster && !this.config.messageBrokerOpts.messageBrokerServer) {
        throw 'When running in cluster mode, message broker server must be configured';
    }

    const expressApp = new ExpressApp(this.config);

    log.info(`Listening on port: ${  this.config.port}`);

    const server = this.config.https ? serverModule.createServer(serverOpts, expressApp.app) : serverModule.Server(expressApp.app);

    server.on('connection', function (socket) {
        socket.setTimeout(300 * 1000);
    });

    expressApp.start(null, (err) => {
        if (err) {
            log.error('Could not start Wallet Service instance', err);
            return cb && cb(err);
        }

        server.listen(this.config.port);

        log.info(`Wallet Service running on ${this.config.port}`);
        return cb && cb();
    });
};

// Start the service with base configuration (default).
const service = new WS();
service.start();
