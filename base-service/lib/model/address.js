'use strict';

var owsCommon = require('@owstack/ows-common');
var keyLib = require('@owstack/key-lib');
var Constants = owsCommon.Constants;
var HDPublicKey = keyLib.HDPublicKey;
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

function Address(context) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;
};

Address.create = function(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  var ctx = context;

  var x = new Address(context);

  x.version = '1.0.0';
  x.createdOn = Math.floor(Date.now() / 1000);
  x.address = opts.address;
  x.walletId = opts.walletId;
  x.isChange = opts.isChange;
  x.path = opts.path;
  x.publicKeys = opts.publicKeys;
  x.network = ctx.Address(x.address).toObject().network;
  x.type = opts.type || Constants.SCRIPT_TYPES.P2SH;
  x.hasActivity = undefined;
  return x;
};

Address.fromObj = function(context, obj) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  var x = new Address(context);

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
  $.checkArgument(lodash.includes(lodash.values(Constants.SCRIPT_TYPES), scriptType));

  var publicKeys = lodash.map(publicKeyRing, function(item) {
    var xpub = new HDPublicKey(item.xPubKey);
    return xpub.deriveChild(path).publicKey;
  });

  var btcAddress;
  switch (scriptType) {
    case Constants.SCRIPT_TYPES.P2SH:
      btcAddress = this.ctx.Address.createMultisig(publicKeys, m, network);
      break;
    case Constants.SCRIPT_TYPES.P2PKH:
      $.checkState(lodash.isArray(publicKeys) && publicKeys.length == 1);
      btcAddress = this.ctx.Address.fromPublicKey(publicKeys[0], network);
      break;
  }

  return {
    address: btcAddress.toString(),
    path: path,
    publicKeys: lodash.invokeMap(publicKeys, 'toString'),
  };
};

Address.prototype.derive = function(walletId, scriptType, publicKeyRing, path, m, network, isChange) {
  var raw = this._deriveAddress(scriptType, publicKeyRing, path, m, network);
console.log('Address.prototype.derive ', raw);
  return Address.create(this.ctx, lodash.extend(raw, {
    walletId: walletId,
    type: scriptType,
    isChange: isChange,
  }));
};

module.exports = Address;
