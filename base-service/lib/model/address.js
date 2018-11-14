'use strict';

var owsCommon = require('@owstack/ows-common');
var keyLib = require('@owstack/key-lib');
var Constants = owsCommon.Constants;
var HDPublicKey = keyLib.HDPublicKey;
var $ = require('preconditions').singleton();

function Address(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  opts = opts || {};
  
  if (opts.fromObj) {
    return;
  }

  this.version = '1.0.0';
  this.createdOn = Math.floor(Date.now() / 1000);
  this.address = opts.address;
  this.walletId = opts.walletId;
  this.isChange = opts.isChange;
  this.path = opts.path;
  this.publicKeys = opts.publicKeys;
  this.network = this.ctx.Address(this.address).toObject().network;
  this.type = opts.type || Constants.SCRIPT_TYPES.P2SH;
  this.hasActivity = undefined;
  return;
};

Address.fromObj = function(context, obj) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  var x = new Address(context, {fromObj: true});

  x.version = obj.version;
  x.createdOn = obj.createdOn;
  x.address = obj.address;
  x.walletId = obj.walletId;
  x.network = obj.network;
  x.isChange = obj.isChange;
  x.path = obj.path;
  x.publicKeys = obj.publicKeys;
  x.type = obj.type || Constants.SCRIPT_TYPES.P2SH;
  x.hasActivity = obj.hasActivity;
  return x;
};

Address.prototype._deriveAddress = function(scriptType, publicKeyRing, path, m, network) {
  $.checkArgument(_.includes(_.values(Constants.SCRIPT_TYPES), scriptType));

  var publicKeys = _.map(publicKeyRing, function(item) {
    var xpub = new HDPublicKey(item.xPubKey);
    return xpub.deriveChild(path).publicKey;
  });

  var btcAddress;
  switch (scriptType) {
    case Constants.SCRIPT_TYPES.P2SH:
      btcAddress = this.ctx.Address.createMultisig(publicKeys, m, network);
      break;
    case Constants.SCRIPT_TYPES.P2PKH:
      $.checkState(_.isArray(publicKeys) && publicKeys.length == 1);
      btcAddress = this.ctx.Address.fromPublicKey(publicKeys[0], network);
      break;
  }

  return {
    address: btcAddress.toString(),
    path: path,
    publicKeys: _.invokeMap(publicKeys, 'toString'),
  };
};

Address.prototype.derive = function(walletId, scriptType, publicKeyRing, path, m, network, isChange) {
  var raw = this._deriveAddress(scriptType, publicKeyRing, path, m, network);
  return this.create(_.extend(raw, {
    walletId: walletId,
    type: scriptType,
    isChange: isChange,
  }));
};

module.exports = Address;
