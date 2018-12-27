'use strict';

var owsCommon = require('@owstack/ows-common');
var Uuid = require('uuid');
var lodash = owsCommon.deps.lodash;

var FIELDS = [
  'version',
  'createdOn',
  'updatedOn',
  'id',
  'copayerId',
  'walletId'
];

class Session {
  constructor(context, opts) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    context.inject(this);

    opts = opts || {};

    if (opts.fromObj) {
      return;
    }

    var now = Math.floor(Date.now() / 1000);

    this.id = Uuid.v4();
    this.version = 1;
    this.createdOn = now;
    this.updatedOn = now;
    this.copayerId = opts.copayerId;
    this.walletId = opts.walletId;
  }
};

Session.fromObj = function(context, obj) {
  var x = new Session(context, {fromObj: true});

  lodash.each(FIELDS, function(k) {
    x[k] = obj[k];
  });

  return x;
};

Session.prototype.toObject = function() {
  var self = this;

  var x = {};
  lodash.each(FIELDS, function(k) {
    x[k] = self[k];
  });
  return x;
};

Session.prototype.isValid = function() {
  var now = Math.floor(Date.now() / 1000);
  return (now - this.updatedOn) <= this.ctx.Defaults.SESSION_EXPIRATION;
};

Session.prototype.touch = function() {
  var now = Math.floor(Date.now() / 1000);
  this.updatedOn = now;
};

module.exports = Session;
