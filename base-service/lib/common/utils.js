const owsCommon = require('@owstack/ows-common');
const BufferReader = owsCommon.encoding.BufferReader;
const Hash = owsCommon.Hash;
const secp256k1 = require('secp256k1');
const lodash = owsCommon.deps.lodash;
const $ = require('preconditions').singleton();

class Utils {
    constructor(context) {
    // Context defines the coin network and is set by the implementing service in
    // order to instance this base service; e.g., btc-service.
        context.inject(this);

        // Set some frequently used contant values based on context.
        this.atomicsAccessor = this.ctx.Unit().atomicsAccessor();
    }
}

Utils.prototype.formatAmount = function (atomic, code, opts) {
    $.shouldBeNumber(atomic);
    return this.ctx.Unit(atomic, 'atomic').toString(code, opts);
};

Utils.prototype.formatAmountInStandard = function (atomic) {
    $.shouldBeNumber(atomic);
    return this.ctx.Unit(atomic, 'atomic').toString('standard');
};

Utils.prototype.formatUtxos = function (utxos) {
    const self = this;
    if (lodash.isEmpty(utxos)) {
        return 'none';
    }
    return lodash.map([].concat(utxos), function (i) {
        const amount = self.formatAmountInStandard(i[self.atomicsAccessor]);
        const confirmations = i.confirmations ? `${i.confirmations  }c` : 'u';
        return `${amount  }/${  confirmations}`;
    }).join(', ');
};

Utils.getMissingFields = function (obj, args) {
    args = [].concat(args);
    if (!lodash.isObject(obj)) {
        return args;
    }
    const missing = lodash.filter(args, function (arg) {
        return !obj.hasOwnProperty(arg);
    });
    return missing;
};

/**
 * @desc rounds a Javascript number
 * @param number
 * @return {number}
 */
Utils.strip = function (number) {
    return parseFloat(number.toPrecision(12));
};

Utils.hashMessage = function (text, noReverse) {
    $.checkArgument(text);
    const buf = Buffer.from(text);
    let ret = Hash.sha256sha256(buf);
    if (!noReverse) {
        ret = new BufferReader(ret).readReverse();
    }
    return ret;
};

Utils.verifyMessage = function (text, signature, publicKey) {
    $.checkArgument(text);

    const hash = Utils.hashMessage(text, true);

    const sig = this._tryImportSignature(signature);
    if (!sig) {
        return false;
    }

    const publicKeyBuffer = this._tryImportPublicKey(publicKey);
    if (!publicKeyBuffer) {
        return false;
    }

    return this._tryVerifyMessage(hash, sig, publicKeyBuffer);
};

Utils._tryImportPublicKey = function (publicKey) {
    let publicKeyBuffer = publicKey;
    try {
        if (!Buffer.isBuffer(publicKey)) {
            publicKeyBuffer = Buffer.from(publicKey, 'hex');
        }
        return publicKeyBuffer;
    } catch (e) {
        return false;
    }
};

Utils._tryImportSignature = function (signature) {
    try {
        let signatureBuffer = signature;
        if (!Buffer.isBuffer(signature)) {
            signatureBuffer = Buffer.from(signature, 'hex');
        }
        return secp256k1.signatureImport(signatureBuffer);
    } catch (e) {
        return false;
    }
};

Utils._tryVerifyMessage = function (hash, sig, publicKeyBuffer) {
    try {
        return secp256k1.verify(hash, sig, publicKeyBuffer);
    } catch (e) {
        return false;
    }
};

Utils.formatRatio = function (ratio) {
    return `${(ratio * 100.).toFixed(4)  }%`;
};

Utils.formatSize = function (size) {
    return `${(size / 1000.).toFixed(4)  }kB`;
};

Utils.parseVersion = function (version) {
    const v = {};

    if (!version) {
        return null;
    }

    let x = version.split('-');
    if (x.length != 2) {
        v.agent = version;
        return v;
    }
    v.agent = lodash.includes(['wc', 'ws'], x[0]) ? 'wc' : x[0];
    x = x[1].split('.');
    v.major = parseInt(x[0]);
    v.minor = parseInt(x[1]);
    v.patch = parseInt(x[2]);

    return v;
};

module.exports = Utils;
