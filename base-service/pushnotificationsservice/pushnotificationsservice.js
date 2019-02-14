

const baseConfig = require('config');
const log = require('npmlog');

log.debug = log.verbose;

class Service {
    constructor(context, config) {
	  // Context defines the coin network and is set by the implementing service in
	  // order to instance this base service; e.g., btc-service.
        context.inject(this);

	  this.config = config || baseConfig;
        this.pushNotificationsService = new this.ctx.PushNotificationsService(this.config);
    }
}

Service.prototype.start = function (opts) {
    this.pushNotificationsService.start(opts, function (err) {
	  if (err) {
	  	throw err;
	  }

	  log.debug('Push Notification service started');
    });
};

if (require.main === module) {
    throw 'The base push notifications service cannot be started from the command line';
}

module.exports = Service;
