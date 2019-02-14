const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BaseStorage = BaseWalletService.Storage;

const Address = require('./model/address');
const Session = require('./model/session');
const TxProposal = require('./model/txproposal');
const Wallet = require('./model/wallet');

const context = new Context({
    Address: Address,
    Session: Session,
    TxProposal: TxProposal,
    Wallet: Wallet
});

class CStorage extends BaseStorage {
    constructor(config, opts) {
        super(context, config, opts);
    }
}

module.exports = CStorage;
