'use strict';

var Model = require('../../../base-service').WalletService.Model;

Model.Address = require('./address');
Model.Copayer = require('./copayer');
Model.Session = require('./session');
Model.TxProposal = require('./txproposal');
Model.Wallet = require('./wallet');

module.exports = Model;
