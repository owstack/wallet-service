#!/usr/bin/env node

const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BasePushNotificationsService = require('../../base-service').PushNotificationsService;
const PushNotificationsService = require('../lib/pushnotificationsservice');

const context = new Context({
    PushNotificationsService: PushNotificationsService
});

class CPushNotificationsService extends BasePushNotificationsService {
    constructor(config) {
        super(context, config);
    }
}

// Start the service with base configuration (default) and no options.
const service = new CPushNotificationsService();
service.start();
