const owsCommon = require('@owstack/ows-common');
const lodash = owsCommon.deps.lodash;

/*
 * Notifications examples
 *
 * NewCopayer -
 * NewAddress -
 * NewTxProposal - (amount)
 * TxProposalAcceptedBy - (txProposalId, copayerId)
 * TxProposalRejectedBy -  (txProposalId, copayerId)
 * txProposalFinallyRejected - txProposalId
 * txProposalFinallyAccepted - txProposalId
 *
 * NewIncomingTx (address, txid)
 * NewOutgoingTx - (txProposalId, txid)
 *
 * data Examples:
 * { amount: 'xxx', address: 'xxx'}
 * { txProposalId: 'xxx', copayerId: 'xxx' }
 *
 * Data is meant to provide only the needed information
 * to notify the user
 *
 */
class Notification {}

Notification.create = function (opts) {
    opts = opts || {};

    const x = new Notification();

    x.version = '1.0.0';
    const now = Date.now();

    x.createdOn = Math.floor(now / 1000);
    x.id = lodash.padStart(now, 14, '0') + lodash.padStart(opts.ticker || 0, 4, '0');
    x.type = opts.type || 'general';
    x.data = opts.data;
    x.walletId = opts.walletId;
    x.creatorId = opts.creatorId;
    x.networkName = opts.networkName;

    return x;
};

Notification.fromObj = function (obj) {
    const x = new Notification();

    x.version = obj.version;
    x.createdOn = obj.createdOn;
    x.id = obj.id;
    x.type = obj.type,
    x.data = obj.data;
    x.walletId = obj.walletId;
    x.creatorId = obj.creatorId;
    x.networkName = obj.networkName;

    return x;
};

module.exports = Notification;
