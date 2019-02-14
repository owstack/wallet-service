#!/usr/bin/env node



const baseConfig = require('config');
const Locker = require('locker-server');

class Service {
    constructor(config) {
        this.lockerService = new Locker();

	  this.config = config || baseConfig;
    }
}

Service.prototype.start = function () {
    this.lockerService.listen(this.config.lockOpts.lockerServer.port);
    console.log(`Locker service started at port ${  this.config.lockOpts.lockerServer.port}`);
};

// Start the service with base configuration (default).
const service = new Service();
service.start();
