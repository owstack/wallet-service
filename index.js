const Service = {};

Service.ExpressApp = require('./base-service/lib/expressapp');

Service.BCH = require('./bch-service');
Service.BTC = require('./btc-service');
Service.LTC = require('./ltc-service');

module.exports = Service;
