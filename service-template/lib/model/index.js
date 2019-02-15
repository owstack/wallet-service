

const lodash = require('@owstack/ows-common').deps.lodash;
const Model = lodash.cloneDeep(require('../../../base-service').WalletService.Model);

Model.Address = require('./address');
Model.Copayer = require('./copayer');
Model.Session = require('./session');
Model.TxProposal = require('./txproposal');
Model.Wallet = require('./wallet');

module.exports = Model;
