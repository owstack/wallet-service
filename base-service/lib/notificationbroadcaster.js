

const events = require('events');
const log = require('npmlog');

log.debug = log.verbose;

class NotificationBroadcaster {}

NotificationBroadcaster.prototype.broadcast = function (eventName, notification, walletService) {
    this.emit(eventName, notification, walletService);
};

let _instance;
NotificationBroadcaster.singleton = function () {
    if (!_instance) {
        _instance = new NotificationBroadcaster();
    }
    return _instance;
};

module.exports = NotificationBroadcaster.singleton();
