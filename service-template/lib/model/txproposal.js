

const cLib = require('../../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../../base-service').WalletService;
const BaseTxProposal = BaseWalletService.Model.TxProposal;

const Address = cLib.Address;
const Defaults = require('../common/defaults');
const Networks = cLib.Networks;
const Transaction = cLib.Transaction;
const Unit = cLib.Unit;

const context = new Context({
    Address: Address,
    Defaults: Defaults,
    Networks: Networks,
    Transaction: Transaction,
    Unit: Unit
});

class CTxProposal extends BaseTxProposal {
    constructor(opts) {
        super(context, opts);
    }
}

/**
 *
 */
CTxProposal.fromObj = function (obj) {
    return BaseTxProposal.fromObj(context, obj);
};

module.exports = CTxProposal;
