const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BasePushNotificationsService = BaseWalletService.PushNotificationsService;

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

class CPushNotificationsService extends BasePushNotificationsService {
    constructor(config) {
        super(context, config);
    }
}

module.exports = CPushNotificationsService;
