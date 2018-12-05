'use strict';

var baseService = require('../../../base-service');
var Model = baseService.WalletService.Model;

Model.Address = require('./address');
Model.Copayer = require('./copayer');
Model.Session = require('./session');
Model.TxProposal = require('./txproposal');
Model.Wallet = require('./wallet');

module.exports = Model;
