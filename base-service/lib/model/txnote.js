class TxNote {}

TxNote.create = function (opts) {
    opts = opts || {};

    const now = Math.floor(Date.now() / 1000);

    const x = new TxNote();

    x.version = 1;
    x.createdOn = now;
    x.walletId = opts.walletId;
    x.txid = opts.txid;
    x.body = opts.body;
    x.editedOn = now;
    x.editedBy = opts.copayerId;

    return x;
};

TxNote.fromObj = function (obj) {
    const x = new TxNote();

    x.version = obj.version;
    x.createdOn = obj.createdOn;
    x.walletId = obj.walletId;
    x.txid = obj.txid;
    x.body = obj.body;
    x.editedOn = obj.editedOn;
    x.editedBy = obj.editedBy;

    return x;
};

TxNote.prototype.edit = function (body, copayerId) {
    this.body = body;
    this.editedBy = copayerId;
    this.editedOn = Math.floor(Date.now() / 1000);
};

TxNote.prototype.toObject = function () {
    return this;
};

module.exports = TxNote;
