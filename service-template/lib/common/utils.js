

const cLib = require('../../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseUtils = BaseWalletService.Common.Utils;

const Unit = cLib.Unit;

const context = new Context({
    Unit: Unit
});

class CUtils extends BaseUtils {
    constructor() {
        super(context);
    }
}

module.exports = CUtils;
