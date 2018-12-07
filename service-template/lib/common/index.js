'use strict';

var baseService = require('../../../base-service');
var Common = baseService.WalletService.Common;

Common.Defaults = require('./defaults');
Common.Utils = require('./utils');

module.exports = Common;
