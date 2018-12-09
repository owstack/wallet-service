'use strict;'

var Service = {};

Service.Base = require('./base-service');

//Service.BCH = require('./bch-service');
Service.BTC = require('./btc-service');
//Service.LTC = require('./ltc-service');

module.exports = Service;
