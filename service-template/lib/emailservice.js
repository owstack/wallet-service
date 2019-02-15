const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BaseEmailService = BaseWalletService.EmailService;

const Common = require('./common');
const Networks = cLib.Networks;
const Storage = require('./storage');
const Unit = cLib.Unit;
const Utils = Common.Utils;

const context = new Context({
    Networks: Networks,
    Storage: Storage,
    Unit: Unit,
    Utils: Utils
});

class CEmailService extends BaseEmailService {
    constructor(config) {
        super(context, config);
    }
}

module.exports = CEmailService;
