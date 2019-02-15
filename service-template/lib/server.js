const cLib = require('../cLib');
const owsCommon = require('@owstack/ows-common');
const Context = owsCommon.util.Context;

const BaseWalletService = require('../../base-service').WalletService;
const BaseServer = BaseWalletService.Server;

const Common = require('./common');
const Model = require('./model');
const Address = cLib.Address;
const BlockchainExplorer = require('./blockchainexplorer');
const Copayer = Model.Copayer;
const Defaults = Common.Defaults;
const Networks = cLib.Networks;
const Session = Model.Session;
const Storage = require('./storage');
const Transaction = cLib.Transaction;
const TxProposal = Model.TxProposal;
const Unit = cLib.Unit;
const Utils = Common.Utils;
const Wallet = Model.Wallet;

let instance;

const context = new Context({
    Address: Address,
    BlockchainExplorer: BlockchainExplorer,
    Copayer: Copayer,
    Defaults: Defaults,
    Networks: Networks,
    Session: Session,
    Storage: Storage,
    Transaction: Transaction,
    TxProposal: TxProposal,
    Unit: Unit,
    Utils: Utils,
    Wallet: Wallet
});

class CServer extends BaseServer {
    constructor(opts, config, cb) {
        super(context, opts, config, cb);
    }
}

/**
 *
 */
CServer.getInstance = function (opts, config, cb) {
    if (instance && opts.force == false) {
        cb(instance);
    } else {
        new CServer(opts, config, function (server) {
            instance = server;
            cb(server);
        });
    }
};

/**
 *
 */
CServer.getInstanceWithAuth = function (opts, config, auth, cb) {
    try {
        CServer.getInstance(opts, config, function (server) {
            server.initInstanceWithAuth(auth, cb);
        });
    } catch (ex) {
        return cb(ex);
    }
};

module.exports = CServer;
