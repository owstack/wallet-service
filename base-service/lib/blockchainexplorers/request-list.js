const owsCommon = require('@owstack/ows-common');
const async = require('async');
const log = require('npmlog');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

log.debug = log.verbose;

const DEFAULT_TIMEOUT = 60000; // 60s

/**
 * Query a server, using one of the given options
 *
 * @param {Object} opts
 * @param {Array} opts.hosts Array of hosts to query. Until the first success one.
 * @param {Array} opts.path Path to request in each server
 */
class RequestList {
    constructor(args, cb) {
        $.checkArgument(args.hosts);
        const request = args.request || require('request');

        if (!lodash.isArray(args.hosts)) {
            args.hosts = [args.hosts];
        }

        args.timeout = args.timeout || DEFAULT_TIMEOUT;

        const urls = lodash.map(args.hosts, function (x) {
            return (x + args.path);
        });
        let nextUrl; let result; let success;

        async.whilst(
            function () {
                nextUrl = urls.shift();
                return nextUrl && !success;
            },
            function (a_cb) {
                args.uri = nextUrl;
                request(args, function (err, res, body) {
                    if (err) {
                        log.warn(`REQUEST FAIL: ${  nextUrl  } ERROR: ${  err}`);
                    }

                    if (res) {
                        success = !!res.statusCode.toString().match(/^[1234]../);
                        if (!success) {
                            log.warn(`REQUEST FAIL: ${  nextUrl  } STATUS CODE: ${  res.statusCode}`);
                        }
                    }

                    result = [err, res, body];
                    return a_cb();
                });
            },
            function (err) {
                if (err) {
                    return cb(err);
                }
                return cb(result[0], result[1], result[2]);
            }
        );
    }
}

module.exports = RequestList;
