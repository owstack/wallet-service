'use strict';

var owsCommon = require('@owstack/ows-common');
var keyLib = require('@owstack/key-lib');
var Constants = owsCommon.Constants;
var HDPublicKey = keyLib.HDPublicKey;
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

var FIELDS = [
  'version',
  'createdOn',
  'address',
  'walletId',
  'isChange',
  'path',
  'publicKeys',
  'networkName',
  'type',
  'hasActivity'
];

class Address {
  constructor(context) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    context.inject(this);
  }
};

Address.create = function(context, opts) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  var x = new Address(context);

  lodash.each(FIELDS, function(k) {
    x[k] = opts[k];
  });

  x.version = '1.0.0';
  x.createdOn = Math.floor(Date.now() / 1000);
  x.networkName = x.ctx.Address(opts.address).toObject().network;
  x.type = x.type || Constants.SCRIPT_TYPES.P2SH;
  x.hasActivity = undefined;
  return x;
};

Address.fromObj = function(context, obj) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  var x = new Address(context);

  lodash.each(FIELDS, function(k) {
    x[k] = obj[k];
  });

  x.type = x.type || Constants.SCRIPT_TYPES.P2SH;
  return x;
};

Address.prototype.toObject = function() {
  var self = this;

  var x = {};
  lodash.each(FIELDS, function(k) {
    x[k] = self[k];
  });
  return x;
};

Address.prototype._deriveAddress = function(scriptType, publicKeyRing, path, m, networkName) {
  var self = this;
  $.checkArgument(lodash.includes(lodash.values(Constants.SCRIPT_TYPES), scriptType));

  var publicKeys = lodash.map(publicKeyRing, function(item) {
    var xpub = new HDPublicKey(item.xPubKey);
    return xpub.deriveChild(path).publicKey;
  });

  var address;
  var network = self.ctx.Networks.get(networkName);

  switch (scriptType) {
    case Constants.SCRIPT_TYPES.P2SH:
      address = self.ctx.Address.createMultisig(publicKeys, m, network.alias);
      break;
    case Constants.SCRIPT_TYPES.P2PKH:
      $.checkState(lodash.isArray(publicKeys) && publicKeys.length == 1);
      address = self.ctx.Address.fromPublicKey(publicKeys[0], network.alias);
      break;
  }

  return {
    address: address.toString(),
    path: path,
    publicKeys: lodash.invokeMap(publicKeys, 'toString'),
    networkName: networkName
  };
};

Address.prototype.derive = function(walletId, scriptType, publicKeyRing, path, m, networkName, isChange) {
  var self = this;
  var raw = self._deriveAddress(scriptType, publicKeyRing, path, m, networkName);
  var address = Address.create(self.getContext(), lodash.extend(raw, {
    walletId: walletId,
    type: scriptType,
    isChange: isChange,
  }));
  return address.toObject();
};

module.exports = Address;
