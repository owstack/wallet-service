'use strict';

var Uuid = require('uuid');

function Session(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

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

  return;
};

Session.fromObj = function(context, obj) {
  var x = new Session(context, {fromObj: true});

  x.id = obj.id;
  x.version = obj.version;
  x.createdOn = obj.createdOn;
  x.updatedOn = obj.updatedOn;
  x.copayerId = obj.copayerId;
  x.walletId = obj.walletId;

  return x;
};

Session.prototype.toObject = function() {
  return this;
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
