#!/usr/bin/env node

'use strict';

var DEFAULT_PORT = 3380;

var io = require('socket.io');

var opts = {
  port: parseInt(process.argv[2]) || DEFAULT_PORT
};

var server = io(opts.port);

server.on('connection', function(socket) {
  socket.on('msg', function(data) {
    server.emit('msg', data);
  });
});

console.log('Message broker server listening on port ' + opts.port);
