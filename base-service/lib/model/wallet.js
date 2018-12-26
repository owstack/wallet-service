'use strict';

var owsCommon = require('@owstack/ows-common');
var AddressManager = require('./addressmanager');
var Constants = owsCommon.Constants;
var util = require('util');
var Uuid = require('uuid');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

class Wallet {
  constructor(context) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    context.inject(this);
  }
};

Wallet.create = function(context, opts) {
  $.shouldBeNumber(opts.m);
  $.shouldBeNumber(opts.n);
  $.checkArgument(opts.networkName);

  var x = new Wallet(context);

  x.version = '1.0.0';
  x.createdOn = Math.floor(Date.now() / 1000);
  x.id = opts.id || Uuid.v4();
  x.name = opts.name;
  x.m = opts.m;
  x.n = opts.n;
  x.singleAddress = !!opts.singleAddress;
  x.status = 'pending';
  x.publicKeyRing = [];
  x.addressIndex = 0;
  x.copayers = [];
  x.pubKey = opts.pubKey;
  x.networkName = opts.networkName;
  x.derivationStrategy = opts.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
  x.addressType = opts.addressType || Constants.SCRIPT_TYPES.P2SH;
  x.addressManager = AddressManager.create({
    derivationStrategy: x.derivationStrategy,
  });
  x.scanStatus = null;

  return x;
};

Wallet.fromObj = function(context, obj) {
  $.shouldBeNumber(obj.m);
  $.shouldBeNumber(obj.n);
  $.checkArgument(obj.networkName);

  var x = new Wallet(context);

  x.version = obj.version;
  x.createdOn = obj.createdOn;
  x.id = obj.id;
  x.name = obj.name;
  x.m = obj.m;
  x.n = obj.n;
  x.singleAddress = !!obj.singleAddress;
  x.status = obj.status;
  x.publicKeyRing = obj.publicKeyRing;
  x.copayers = lodash.map(obj.copayers, function(copayer) {
    return x.ctx.Copayer.fromObj(copayer);
  });
  x.pubKey = obj.pubKey;
  x.networkName = obj.networkName;
  x.derivationStrategy = obj.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
  x.addressType = obj.addressType || Constants.SCRIPT_TYPES.P2SH;
  x.addressManager = AddressManager.fromObj(obj.addressManager);
  x.scanStatus = obj.scanStatus;

  return x;
};

Wallet.prototype.toObject = function() {
  var x = lodash.cloneDeep(this);
  x.isShared = this.isShared();
  delete x.ctx; // Remove the injected context.
  return x;
};

/**
 * Get the maximum allowed number of required copayers.
 * This is a limit imposed by the maximum allowed size of the scriptSig.
 * @param {number} totalCopayers - the total number of copayers
 * @return {number}
 */
Wallet.getMaxRequiredCopayers = function(totalCopayers) {
  return Wallet.COPAYER_PAIR_LIMITS[totalCopayers];
};

Wallet.verifyCopayerLimits = function(m, n) {
  return (n >= 1 && n <= 15) && (m >= 1 && m <= n);
};

Wallet.prototype.isShared = function() {
  return this.n > 1;
};


Wallet.prototype._updatePublicKeyRing = function() {
  this.publicKeyRing = lodash.map(this.copayers, function(copayer) {
    return lodash.pick(copayer, ['xPubKey', 'requestPubKey']);
  });
};

Wallet.prototype.addCopayer = function(copayer) {
  this.copayers.push(copayer);
  if (this.copayers.length < this.n) return;

  this.status = 'complete';
  this._updatePublicKeyRing();
};

Wallet.prototype.addCopayerRequestKey = function(copayerId, requestPubKey, signature, restrictions, name) {
  $.checkState(this.copayers.length == this.n);

  var c = this.getCopayer(copayerId);

  //new ones go first
  c.requestPubKeys.unshift({
    key: requestPubKey.toString(),
    signature: signature,
    selfSigned: true,
    restrictions: restrictions || {},
    name: name || null,
  });
};

Wallet.prototype.getCopayer = function(copayerId) {
  return lodash.find(this.copayers, {
    id: copayerId
  });
};

Wallet.prototype.isComplete = function() {
  return this.status == 'complete';
};

Wallet.prototype.isScanning = function() {
  return this.scanning;
};

Wallet.prototype.createAddress = function(isChange) {
  $.checkState(this.isComplete());

  var self = this;
  var path = this.addressManager.getNewAddressPath(isChange);
  var address = new self.ctx.Address().derive(self.id, self.addressType, self.publicKeyRing, path, self.m, self.networkName, isChange);
  return address;
};

module.exports = Wallet;
