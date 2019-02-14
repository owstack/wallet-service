

const baseConfig = require('config');
const io = require('socket.io');
const log = require('npmlog');

log.debug = log.verbose;

class Service {
    constructor(config) {
	  this.config = config || baseConfig;
    }
}

Service.prototype.start = function () {
    const server = io(this.config.messageBrokerOpts.port);

    server.on('connection', function (socket) {
	  socket.on('msg', function (data) {
	    server.emit('msg', data);
	  });
    });

    console.log(`Message broker server listening on port ${  this.config.messageBrokerOpts.port}`);
};

// Start the service with base configuration (default).
const service = new Service();
service.start();
