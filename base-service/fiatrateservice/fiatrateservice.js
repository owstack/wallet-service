#!/usr/bin/env node

const baseConfig = require('config');
const FiatRateService = require('../lib/fiatrateservice');
const log = require('npmlog');

log.debug = log.verbose;

class Service {
    constructor(config) {
        this.config = config || baseConfig;
        this.fiatRateService = new FiatRateService(this.config);
    }
}

Service.prototype.start = function () {
    this.fiatRateService.start(function (err) {
        if (err) {
            throw err;
        }

        console.log('Fiat rate service started');
    });
};

// Start the service with base configuration (default).
const service = new Service();
service.start();
