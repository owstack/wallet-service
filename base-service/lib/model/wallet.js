const owsCommon = require('@owstack/ows-common');
const AddressManager = require('./addressmanager');
const Constants = owsCommon.Constants;
const Uuid = require('uuid');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

const FIELDS = [
    'version',
    'createdOn',
    'id',
    'name',
    'm',
    'n',
    'singleAddress',
    'status',
    'publicKeyRing',
    'copayers',
    'pubKey',
    'networkName',
    'derivationStrategy',
    'addressType',
    'addressManager',
    'scanStatus'
];

class Wallet {
    constructor(context) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
        context.inject(this);
    }
}

Wallet.create = function (context, opts) {
    $.shouldBeNumber(opts.m);
    $.shouldBeNumber(opts.n);
    $.checkArgument(opts.networkName);

    const x = new Wallet(context);

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

Wallet.fromObj = function (context, obj) {
    $.shouldBeNumber(obj.m);
    $.shouldBeNumber(obj.n);
    $.checkArgument(obj.networkName);

    const x = new Wallet(context);

    lodash.each(FIELDS, function (k) {
        x[k] = obj[k];
    });

    x.singleAddress = !!obj.singleAddress;
    x.copayers = lodash.map(obj.copayers, function (copayer) {
        return x.ctx.Copayer.fromObj(copayer);
    });
    x.derivationStrategy = x.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
    x.addressType = x.addressType || Constants.SCRIPT_TYPES.P2SH;
    x.addressManager = AddressManager.fromObj(obj.addressManager);

    return x;
};

Wallet.prototype.toObject = function () {
    const self = this;

    const x = {};
    lodash.each(FIELDS, function (k) {
        x[k] = self[k];
    });

    x.copayers = lodash.map(x.copayers, function (copayer) {
        return copayer.toObject();
    });

    x.isShared = this.isShared();

    return x;
};

/**
 * Get the maximum allowed number of required copayers.
 * This is a limit imposed by the maximum allowed size of the scriptSig.
 * @param {number} totalCopayers - the total number of copayers
 * @return {number}
 */
Wallet.getMaxRequiredCopayers = function (totalCopayers) {
    return Wallet.COPAYER_PAIR_LIMITS[totalCopayers];
};

Wallet.verifyCopayerLimits = function (m, n) {
    return (n >= 1 && n <= 15) && (m >= 1 && m <= n);
};

Wallet.prototype.isShared = function () {
    return this.n > 1;
};
Wallet.prototype._updatePublicKeyRing = function () {
    this.publicKeyRing = lodash.map(this.copayers, function (copayer) {
        return lodash.pick(copayer, ['xPubKey', 'requestPubKeys']);
    });
};

Wallet.prototype.addCopayer = function (copayer) {
    this.copayers.push(copayer);
    if (this.copayers.length < this.n) {
        return;
    }

    this.status = 'complete';
    this._updatePublicKeyRing();
};

Wallet.prototype.addCopayerRequestKey = function (copayerId, requestPubKey, signature, restrictions, name) {
    $.checkState(this.copayers.length == this.n);

    const c = this.getCopayer(copayerId);

    //new ones go first
    c.requestPubKeys.unshift({
        key: requestPubKey.toString(),
        signature: signature,
        selfSigned: true,
        restrictions: restrictions || {},
        name: name || null,
    });
};

Wallet.prototype.getCopayer = function (copayerId) {
    return lodash.find(this.copayers, {
        id: copayerId
    });
};

Wallet.prototype.isComplete = function () {
    return this.status == 'complete';
};

Wallet.prototype.isScanning = function () {
    return this.scanning;
};

Wallet.prototype.createAddress = function (isChange) {
    $.checkState(this.isComplete());

    const self = this;
    const path = self.addressManager.getNewAddressPath(isChange);
    const address = new self.ctx.Address().derive(self.id, self.addressType, self.publicKeyRing, path, self.m, self.networkName, isChange);
    return address;
};

module.exports = Wallet;
