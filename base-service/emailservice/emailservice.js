const baseConfig = require('config');
const log = require('npmlog');

log.debug = log.verbose;

class Service {
    constructor(context, config) {
        // Context defines the coin network and is set by the implementing service in
        // order to instance this base service; e.g., btc-service.
        context.inject(this);

        this.config = config || baseConfig;
        this.emailService = new this.ctx.EmailService(this.config);
    }
}

Service.prototype.start = function (opts) {
    if (this.config.emailOpts) {
        this.emailService.start(opts, function (err) {
            if (err) {
                throw err;
            }

            console.log('Email service started');
        });
    } else {
        console.log('Email service not configured');
    }
};

if (require.main === module) {
    throw 'The base email service cannot be started from the command line';
}

module.exports = Service;
