const owsCommon = require('@owstack/ows-common');
const Constants = owsCommon.Constants;
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

class AddressManager {}

AddressManager.create = function (opts) {
    opts = opts || {};

    const x = new AddressManager();

    x.version = 2;
    x.derivationStrategy = opts.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
    $.checkState(lodash.includes(lodash.values(Constants.DERIVATION_STRATEGIES), x.derivationStrategy));

    x.receiveAddressIndex = 0;
    x.changeAddressIndex = 0;
    x.copayerIndex = lodash.isNumber(opts.copayerIndex) ? opts.copayerIndex : Constants.BIP45_SHARED_INDEX;

    return x;
};

AddressManager.fromObj = function (obj) {
    const x = new AddressManager();

    x.version = obj.version;
    x.derivationStrategy = obj.derivationStrategy || Constants.DERIVATION_STRATEGIES.BIP45;
    x.receiveAddressIndex = obj.receiveAddressIndex;
    x.changeAddressIndex = obj.changeAddressIndex;
    x.copayerIndex = obj.copayerIndex;

    return x;
};

AddressManager.supportsCopayerBranches = function (derivationStrategy) {
    return derivationStrategy == Constants.DERIVATION_STRATEGIES.BIP45;
};

AddressManager.prototype._incrementIndex = function (isChange) {
    if (isChange) {
        this.changeAddressIndex++;
    } else {
        this.receiveAddressIndex++;
    }
};

AddressManager.prototype.rewindIndex = function (isChange, n) {
    n = lodash.isUndefined(n) ? 1 : n;
    if (isChange) {
        this.changeAddressIndex = Math.max(0, this.changeAddressIndex - n);
    } else {
        this.receiveAddressIndex = Math.max(0, this.receiveAddressIndex - n);
    }
};

AddressManager.prototype.getCurrentAddressPath = function (isChange) {
    return `m/${
        this.derivationStrategy == Constants.DERIVATION_STRATEGIES.BIP45 ? `${this.copayerIndex  }/` : ''
    }${isChange ? 1 : 0  }/${
        isChange ? this.changeAddressIndex : this.receiveAddressIndex}`;
};

AddressManager.prototype.getNewAddressPath = function (isChange) {
    const ret = this.getCurrentAddressPath(isChange);
    this._incrementIndex(isChange);
    return ret;
};

module.exports = AddressManager;
