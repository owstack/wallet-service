'use strict';

var lodash = require('lodash');
var Common = lodash.cloneDeep(require('../../../base-service').WalletService.Common);

Common.Defaults = require('./defaults');
Common.Utils = require('./utils');

module.exports = Common;
