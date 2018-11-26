#!/usr/bin/env node

'use strict';

var baseConfig = require('../config');
var Locker = require('locker-server');

var Service = function(config) {
	this.lockerService = new Locker();	

  this.config = config || baseConfig;
};

Service.prototype.start = function() {
	this.lockerService.listen(this.config.lockOpts.lockerServer.port);
	console.log('Locker service started at port ' + this.config.lockOpts.lockerServer.port);
};

// Start the service with base configuration (default).
var service = new Service();
service.start();
