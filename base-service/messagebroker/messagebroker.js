'use strict';

var baseConfig = require('../config');
var io = require('socket.io');
var log = require('npmlog');

log.debug = log.verbose;

function Service(context, config) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.COIN = this.ctx.Networks.coin;

  this.config = config || baseConfig;
};

Service.prototype.start = function() {
	var server = io(this.config[this.COIN].messageBrokerOpts.port);

	server.on('connection', function(socket) {
	  socket.on('msg', function(data) {
	    server.emit('msg', data);
	  });
	});

	console.log('Message broker server listening on port ' + this.config[this.COIN].messageBrokerOpts.port);
};

if (require.main === module) {
	throw 'The base message broker cannot be started from the command line';
}

module.exports = Service;
