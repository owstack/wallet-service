#!/usr/bin/env node

var PORT = 3231;

var Locker = require('locker-server');
var locker = new Locker();

locker.listen(PORT);

console.log('Server started at port ' + PORT + '...');
