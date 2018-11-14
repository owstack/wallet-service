'use strict';

var Model = {};

Model.Address = require('./address');
Model.Copayer = require('./copayer');
Model.Email = require('./email');
Model.Notification = require('./notification');
Model.Preferences = require('./preferences');
Model.PushNotificationSub = require('./pushnotificationsub');
Model.Session = require('./session');
Model.TxConfirmationSub = require('./txconfirmationsub');
Model.TxNote = require('./txnote');
Model.TxProposal = require('./txproposal');
Model.Wallet = require('./wallet');

module.exports = Model;
