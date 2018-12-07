'use strict';

var Service = require('../base-service');

Service.Node = require('./node/node');
Service.WalletService = require('./lib');

module.exports = Service;
