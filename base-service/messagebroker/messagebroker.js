'use strict';

var baseConfig = require('../config');
var io = require('socket.io');
var log = require('npmlog');

log.debug = log.verbose;

function Service(config) {
  this.config = config || baseConfig;
};

Service.prototype.start = function() {
	var server = io(this.config.messageBrokerOpts.port);

	server.on('connection', function(socket) {
	  socket.on('msg', function(data) {
	    server.emit('msg', data);
	  });
	});

	console.log('Message broker server listening on port ' + this.config.messageBrokerOpts.port);
};

if (require.main === module) {
	throw 'The base message broker cannot be started from the command line';
}

// Start the service with base configuration (default).
var service = new Service();
service.start();
