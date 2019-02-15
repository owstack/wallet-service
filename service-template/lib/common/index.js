

const lodash = require('@owstack/ows-common').deps.lodash;
const Common = lodash.cloneDeep(require('../../../base-service').WalletService.Common);

Common.Defaults = require('./defaults');
Common.Utils = require('./utils');

module.exports = Common;
