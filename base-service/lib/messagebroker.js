

const owsCommon = require('@owstack/ows-common');
const baseConfig = require('config');
const EventEmitter = require('events').EventEmitter;
const log = require('npmlog');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

log.debug = log.verbose;
log.disableColor();

class MessageBroker extends EventEmitter {
    constructor(config) {
        super();
        const self = this;
        config = config || baseConfig;

        if (config.messageBrokerServer) {
            const url = config.messageBrokerServer.url;
            self.remote = true;
            self.mq = require('socket.io-client').connect(url);
            self.mq.on('connect', function () {});
            self.mq.on('connect_error', function () {
                log.warn(`Error connecting to message broker server @ ${  url}`);
            });

            self.mq.on('msg', function (data) {
                self.emit('msg', data);
            });

            log.info(`Using message broker server at ${  url}`);
        }
    }
}

MessageBroker.isNotificationForMe = function (notification, networkNames) {
    if (!lodash.isArray(networkNames)) {
        networkNames = [networkNames];
    }
    return lodash.includes(networkNames, notification.networkName);
};

MessageBroker.prototype.send = function (data) {
    if (this.remote) {
        this.mq.emit('msg', data);
    } else {
        this.emit('msg', data);
    }
};

MessageBroker.prototype.onMessage = function (handler) {
    this.on('msg', handler);
};

module.exports = MessageBroker;
