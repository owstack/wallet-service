#!/usr/bin/env node

'use strict';

var Locker = require('locker-server');

var PORT = 3231;

var Service = function() {
	this.lockerService = new Locker();	
};

Service.prototype.start = function() {
	this.lockerService.listen(PORT);
	console.log('Locker service started at port ' + PORT);
};

module.exports = Service;
