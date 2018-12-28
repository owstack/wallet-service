'use strict';

var owsCommon = require('@owstack/ows-common');
var keyLib = require('@owstack/key-lib');
var Constants = owsCommon.Constants;
var HDPublicKey = keyLib.HDPublicKey;
var log = require('npmlog');
var Signature = keyLib.crypto.Signature;
var TxProposalAction = require('./txproposalaction');
var Uuid = require('uuid');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;
log.disableColor();

var FIELDS = [
  'version',
  'createdOn',
  'id',
  'walletId',
  'creatorId',
  'creatorName',
  'networkName',
  'outputs',
  'amount',
  'message',
  'payProUrl',
  'changeAddress',
  'inputs',
  'walletM',
  'walletN',
  'requiredSignatures',
  'requiredRejections',
  'status',
  'txid',
  'broadcastedOn',
  'inputPaths',
  'actions',
  'outputOrder',
  'fee',
  'feeLevel',
  'feePerKb',
  'excludeUnconfirmedUtxos',
  'addressType',
  'customData',
  'proposalSignature',
  'proposalSignaturePubKey',
  'proposalSignaturePubKeySig'
];

class TxProposal {
  constructor(context, opts) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
    context.inject(this);

    // Set some frequently used contant values based on context.
    this.LIVENET = this.ctx.Networks.livenet;
    this.TESTNET = this.ctx.Networks.testnet;
    this.atomicsName = this.ctx.Unit().atomicsName();

    opts = opts || {};

    if (opts.fromObj) {
      return;
    }

    this.version = 3;

    var now = Date.now();
    this.createdOn = Math.floor(now / 1000);
    this.id = opts.id || Uuid.v4();
    this.walletId = opts.walletId;
    this.creatorId = opts.creatorId;
    this.message = opts.message;
    this.payProUrl = opts.payProUrl;
    this.changeAddress = opts.changeAddress;
    this.outputs = lodash.map(opts.outputs, function(output) {
      return lodash.pick(output, ['amount', 'toAddress', 'message', 'script']);
    });
    this.outputOrder = lodash.range(this.outputs.length + 1);
    if (!opts.noShuffleOutputs) {
      this.outputOrder = lodash.shuffle(this.outputOrder);
    }
    this.walletM = opts.walletM;
    this.walletN = opts.walletN;
    this.requiredSignatures = this.walletM;
    this.requiredRejections = Math.min(this.walletM, this.walletN - this.walletM + 1),
    this.status = 'temporary';
    this.actions = [];
    this.feeLevel = opts.feeLevel;
    this.feePerKb = opts.feePerKb;
    this.excludeUnconfirmedUtxos = opts.excludeUnconfirmedUtxos;

    this.addressType = opts.addressType || (this.walletN > 1 ? Constants.SCRIPT_TYPES.P2SH : Constants.SCRIPT_TYPES.P2PKH);
    $.checkState(lodash.includes(lodash.values(Constants.SCRIPT_TYPES), this.addressType));

    this.customData = opts.customData;
    this.amount = this.getTotalAmount();

    var address;
    try {
      address = this.ctx.Address(this.outputs[0].toAddress).toObject();
    } catch (ex) {}

    this.networkName = opts.networkName || address.network;
    $.checkState(lodash.includes(lodash.values([this.LIVENET.name, this.TESTNET.name]), this.networkName));

    this.setInputs(opts.inputs);
    this.fee = opts.fee;
  }
};

TxProposal.fromObj = function(context, obj) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  var x = new TxProposal(context, {fromObj: true});

  lodash.each(FIELDS, function(k) {
    x[k] = obj[k];
  });

  x.actions = lodash.map(obj.actions, function(action) {
    return TxProposalAction.fromObj(action);
  });

  return x;
};

TxProposal.prototype.toObject = function() {
  var self = this;

  var x = {};
  lodash.each(FIELDS, function(k) {
    x[k] = self[k];
  });

  x.changeAddress = (x.changeAddress && x.changeAddress.toObject ? x.changeAddress.toObject() : x.changeAddress);
  x.isPending = this.isPending();
  return x;
};

TxProposal.prototype.setInputs = function(inputs) {
  this.inputs = inputs || [];
  this.inputPaths = lodash.map(inputs, 'path') || [];
};

TxProposal.prototype._updateStatus = function() {
  if (this.status != 'pending') return;

  if (this.isRejected()) {
    this.status = 'rejected';
  } else if (this.isAccepted()) {
    this.status = 'accepted';
  }
};

TxProposal.prototype._buildTx = function() {
  var self = this;

  var t = new self.ctx.Transaction();

  $.checkState(lodash.includes(lodash.values(Constants.SCRIPT_TYPES), self.addressType));

  switch (self.addressType) {
    case Constants.SCRIPT_TYPES.P2SH:
      lodash.each(self.inputs, function(i) {
        $.checkState(i.publicKeys, 'Inputs should include public keys');
        t.from(i, i.publicKeys, self.requiredSignatures);
      });
      break;
    case Constants.SCRIPT_TYPES.P2PKH:
      t.from(self.inputs);
      break;
  }

  lodash.each(self.outputs, function(o) {
    $.checkState(o.script || o.toAddress, 'Output should have either toAddress or script specified');
    if (o.script) {
      var arg = {};
      arg.script = o.script;
      arg[self.atomicsName] = o.amount;
      t.addOutput(new self.ctx.Transaction.Output(arg));
    } else {
      t.to(o.toAddress, o.amount);
    }
  });

  t.fee(self.fee);

  if (self.changeAddress) {
    t.change(self.changeAddress.address);
  }

  // Shuffle outputs for improved privacy
  if (t.outputs.length > 1) {
    var outputOrder = lodash.reject(self.outputOrder, function(order) {
      return order >= t.outputs.length;
    });
    $.checkState(t.outputs.length == outputOrder.length);
    t.sortOutputs(function(outputs) {
      return lodash.map(outputOrder, function(i) {
        return outputs[i];
      });
    });
  }

  // Validate actual inputs vs outputs independently
  var totalInputs = lodash.sumBy(t.inputs, 'output.'+self.atomicsName);
  var totalOutputs = lodash.sumBy(t.outputs, self.atomicsName);

  $.checkState(totalInputs > 0 && totalOutputs > 0 && totalInputs >= totalOutputs);
  $.checkState(totalInputs - totalOutputs <= this.ctx.Defaults.MAX_TX_FEE);

  return t;
};


TxProposal.prototype._getCurrentSignatures = function() {
  var acceptedActions = lodash.filter(this.actions, {
    type: 'accept'
  });

  return lodash.map(acceptedActions, function(x) {
    return {
      signatures: x.signatures,
      xpub: x.xpub,
    };
  });
};

TxProposal.prototype.getTx = function() {
  var self = this;

  var t = this._buildTx();

  var sigs = this._getCurrentSignatures();
  lodash.each(sigs, function(x) {
    self._addSignaturesToTx(t, x.signatures, x.xpub);
  });

  return t;
};

TxProposal.prototype.getRawTx = function() {
  var t = this.getTx();

  return t.uncheckedSerialize();
};

TxProposal.prototype.getEstimatedSizeForSingleInput = function() {
  switch (this.addressType) {
    case Constants.SCRIPT_TYPES.P2PKH:
      return 147;
    default:
    case Constants.SCRIPT_TYPES.P2SH:
      return this.requiredSignatures * 72 + this.walletN * 36 + 44;
  }
};

TxProposal.prototype.getEstimatedSize = function() {
  // Note: found empirically based on all multisig P2SH inputs and within m & n allowed limits.
  var safetyMargin = 0.02;

  var overhead = 4 + 4 + 9 + 9;
  var inputSize = this.getEstimatedSizeForSingleInput();
  var outputSize = 34;
  var nbInputs = this.inputs.length;
  var nbOutputs = (lodash.isArray(this.outputs) ? Math.max(1, this.outputs.length) : 1) + 1;

  var size = overhead + inputSize * nbInputs + outputSize * nbOutputs;

  return parseInt((size * (1 + safetyMargin)).toFixed(0));
};

TxProposal.prototype.getEstimatedFee = function() {
  $.checkState(lodash.isNumber(this.feePerKb));
  var fee = this.feePerKb * this.getEstimatedSize() / 1000;
  return parseInt(fee.toFixed(0));
};

TxProposal.prototype.estimateFee = function() {
  this.fee = this.getEstimatedFee();
};

/**
 * getTotalAmount
 *
 * @return {Number} total amount of all outputs excluding change output
 */
TxProposal.prototype.getTotalAmount = function() {
  return lodash.sumBy(this.outputs, 'amount');
};

/**
 * getActors
 *
 * @return {String[]} copayerIds that performed actions in this proposal (accept / reject)
 */
TxProposal.prototype.getActors = function() {
  return lodash.map(this.actions, 'copayerId');
};


/**
 * getApprovers
 *
 * @return {String[]} copayerIds that approved the tx proposal (accept)
 */
TxProposal.prototype.getApprovers = function() {
  return lodash.map(
    lodash.filter(this.actions, {
      type: 'accept'
    }), 'copayerId');
};

/**
 * getActionBy
 *
 * @param {String} copayerId
 * @return {Object} type / createdOn
 */
TxProposal.prototype.getActionBy = function(copayerId) {
  return lodash.find(this.actions, {
    copayerId: copayerId
  });
};

TxProposal.prototype.addAction = function(copayerId, type, comment, signatures, xpub) {
  var action = TxProposalAction.create({
    copayerId: copayerId,
    type: type,
    signatures: signatures,
    xpub: xpub,
    comment: comment,
  });
  this.actions.push(action);
  this._updateStatus();
};

TxProposal.prototype._addSignaturesToTx = function(tx, signatures, xpub) {
  var self = this;

  if (signatures.length != this.inputs.length)
    throw new Error('Number of signatures does not match number of inputs');

  var i = 0;
  var x = new HDPublicKey(xpub);

  lodash.each(signatures, function(signatureHex) {
    var input = self.inputs[i];
    try {
      var signature = Signature.fromString(signatureHex);
      var pub = x.deriveChild(self.inputPaths[i]).publicKey;
      var s = {
        inputIndex: i,
        signature: signature,
        sigtype: Signature.SIGHASH_ALL,
        publicKey: pub,
      };
      tx.inputs[i].addSignature(tx, s);
      i++;
    } catch (e) {};
  });

  if (i != tx.inputs.length)
    throw new Error('Wrong signatures');
};


TxProposal.prototype.sign = function(copayerId, signatures, xpub) {
  try {
    // Tests signatures are OK
    var tx = this.getTx();
    this._addSignaturesToTx(tx, signatures, xpub);

    this.addAction(copayerId, 'accept', null, signatures, xpub);

    if (this.status == 'accepted') {
      this.raw = tx.uncheckedSerialize();
      this.txid = tx.id;
    }

    return true;
  } catch (e) {
    log.debug(e);
    return false;
  }
};

TxProposal.prototype.reject = function(copayerId, reason) {
  this.addAction(copayerId, 'reject', reason);
};

TxProposal.prototype.isTemporary = function() {
  return this.status == 'temporary';
};

TxProposal.prototype.isPending = function() {
  return !lodash.includes(['temporary', 'broadcasted', 'rejected'], this.status);
};

TxProposal.prototype.isAccepted = function() {
  var votes = lodash.countBy(this.actions, 'type');
  return votes['accept'] >= this.requiredSignatures;
};

TxProposal.prototype.isRejected = function() {
  var votes = lodash.countBy(this.actions, 'type');
  return votes['reject'] >= this.requiredRejections;
};

TxProposal.prototype.isBroadcasted = function() {
  return this.status == 'broadcasted';
};

TxProposal.prototype.setBroadcasted = function() {
  $.checkState(this.txid);
  this.status = 'broadcasted';
  this.broadcastedOn = Math.floor(Date.now() / 1000);
};

module.exports = TxProposal;
