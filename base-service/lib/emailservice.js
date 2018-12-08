'use strict';

var owsCommon = require('@owstack/ows-common');
var async = require('async');
var baseConfig = require('../config');
var fs = require('fs');
var log = require('npmlog');
var Lock = require('./lock');
var MessageBroker = require('./messagebroker');
var Model = require('./model');
var Mustache = require('mustache');
var nodemailer = require('nodemailer');
var path = require('path');
var lodash = owsCommon.deps.lodash;
var $ = require('preconditions').singleton();

log.debug = log.verbose;

var EMAIL_TYPES = {
  'NewCopayer': {
    filename: 'new_copayer',
    notifyDoer: false,
    notifyOthers: true,
  },
  'WalletComplete': {
    filename: 'wallet_complete',
    notifyDoer: true,
    notifyOthers: true,
  },
  'NewTxProposal': {
    filename: 'new_tx_proposal',
    notifyDoer: false,
    notifyOthers: true,
  },
  'NewOutgoingTx': {
    filename: 'new_outgoing_tx',
    notifyDoer: true,
    notifyOthers: true,
  },
  'NewIncomingTx': {
    filename: 'new_incoming_tx',
    notifyDoer: true,
    notifyOthers: true,
  },
  'TxProposalFinallyRejected': {
    filename: 'txp_finally_rejected',
    notifyDoer: false,
    notifyOthers: true,
  },
  'TxConfirmation': {
    filename: 'tx_confirmation',
    notifyDoer: true,
    notifyOthers: false,
  },
};

function EmailService(context, config) {
  // Context defines the coin network and is set by the implementing service in
  // order to instance this base service; e.g., btc-service.
  this.ctx = context;

  // Set some frequently used contant values based on context.
  this.LIVENET = this.ctx.Networks.livenet.code;
  this.TESTNET = this.ctx.Networks.testnet.code;
  this.COIN = this.ctx.Networks.coin;

  this.config = config || baseConfig;
};

EmailService.prototype.start = function(opts, cb) {
  var self = this;
  opts = opts || {};

  function _readDirectories(basePath, cb) {
    fs.readdir(basePath, function(err, files) {
      if (err) return cb(err);
      async.filter(files, function(file, next) {
        fs.stat(path.join(basePath, file), function(err, stats) {
          return next(!err && stats.isDirectory());
        });
      }, function(dirs) {
        return cb(null, dirs);
      });
    });
  };

  var emailOpts = self.config[self.COIN].emailOpts;
  self.defaultLanguage = emailOpts.defaultLanguage;
  self.defaultUnit = self.ctx.Unit().standardsName();
  self.templatePath = path.normalize((emailOpts.templatePath || (__dirname + '/templates')) + '/');
  self.publicTxUrlTemplate = emailOpts.publicTxUrlTemplate || {};
  self.subjectPrefix = emailOpts.subjectPrefix || '[Wallet service]';
  self.from = emailOpts.from;

  $.checkArgument(self.defaultLanguage, 'Missing defaultLanguage attribute in configuration.');
  $.checkArgument(self.defaultUnit, 'Missing defaultUnit attribute in configuration.');

  async.parallel([
    function(done) {
      _readDirectories(self.templatePath, function(err, res) {
        self.availableLanguages = res;
        done(err);
      });
    },
    function(done) {
      if (opts.storage) {
        self.storage = opts.storage;
        done();
      } else {
        self.storage = new self.ctx.Storage();
        self.storage.connect(self.config.storageOpts, done);
      }
    },
    function(done) {
      self.messageBroker = opts.messageBroker || new MessageBroker(self.config.messageBrokerOpts);
      self.messageBroker.onMessage(lodash.bind(self.sendEmail, self));
      done();
    },
    function(done) {
      self.lock = opts.lock || new Lock(self.config.lockOpts);
      done();
    },
    function(done) {
      self.mailer = self.config.mailer || nodemailer.createTransport(self.config[self.COIN].emailOpts);
      done();
    },
  ], function(err) {
    if (err) {
      log.error(err);
    }
    return cb(err);
  });
};

EmailService.prototype._compileTemplate = function(template, extension) {
  var lines = template.split('\n');
  if (extension == '.html') {
    lines.unshift('');
  }
  return {
    subject: lines[0],
    body: lodash.tail(lines).join('\n'),
  };
};

EmailService.prototype._readTemplateFile = function(language, filename, cb) {
  var self = this;

  var fullFilename = path.join(self.templatePath, language, filename);
  fs.readFile(fullFilename, 'utf8', function(err, template) {
    if (err) {
      return cb(new Error('Could not read template file ' + fullFilename, err));
    }
    return cb(null, template);
  });
};

// TODO: cache for X minutes
EmailService.prototype._loadTemplate = function(emailType, recipient, extension, cb) {
  var self = this;

  self._readTemplateFile(recipient.language, emailType.filename + extension, function(err, template) {
    if (err) return cb(err);
    return cb(null, self._compileTemplate(template, extension));
  });
};

EmailService.prototype._applyTemplate = function(template, data, cb) {
  if (!data) return cb(new Error('Could not apply template to empty data'));

  var error;
  var result = lodash.mapValues(template, function(t) {
    try {
      return Mustache.render(t, data);
    } catch (e) {
      log.error('Could not apply data to template', e);
      error = e;
    }
  });
  if (error) return cb(error);
  return cb(null, result);
};

EmailService.prototype._getRecipientsList = function(notification, emailType, cb) {
  var self = this;

  self.storage.fetchPreferences(notification.walletId, null, function(err, preferences) {
    if (err) return cb(err);
    if (lodash.isEmpty(preferences)) return cb(null, []);

    var usedEmails = {};
    var recipients = lodash.compact(lodash.map(preferences, function(p) {
      if (!p.email || usedEmails[p.email]) return;

      usedEmails[p.email] = true;
      if (notification.creatorId == p.copayerId && !emailType.notifyDoer) return;
      if (notification.creatorId != p.copayerId && !emailType.notifyOthers) return;
      if (!lodash.includes(self.availableLanguages, p.language)) {
        if (p.language) {
          log.warn('Language for email "' + p.language + '" not available.');
        }
        p.language = self.defaultLanguage;
      }

      return {
        copayerId: p.copayerId,
        emailAddress: p.email,
        language: p.language,
        unit: p.unit || self.defaultUnit,
      };
    }));

    return cb(null, recipients);
  });
};

EmailService.prototype._getDataForTemplate = function(notification, recipient, cb) {
  var self = this;

  var data = lodash.cloneDeep(notification.data);
  data.subjectPrefix = lodash.trim(self.subjectPrefix) + ' ';
  if (data.amount) {
    try {
      var unit = recipient.unit;
      data.amount = self.ctx.Utils().formatAmount(+data.amount, unit);
    } catch (ex) {
      return cb(new Error('Could not format amount', ex));
    }
  }
  self.storage.fetchWallet(notification.walletId, function(err, wallet) {
    if (err) return cb(err);
    data.walletId = wallet.id;
    data.walletName = wallet.name;
    data.walletM = wallet.m;
    data.walletN = wallet.n;
    var copayer = lodash.find(wallet.copayers, {
      id: notification.creatorId
    });
    if (copayer) {
      data.copayerId = copayer.id;
      data.copayerName = copayer.name;
    }

    if (notification.type == 'TxProposalFinallyRejected' && data.rejectedBy) {
      var rejectors = lodash.map(data.rejectedBy, function(copayerId) {
        return lodash.find(wallet.copayers, {
          id: copayerId
        }).name
      });
      data.rejectorsNames = rejectors.join(', ');
    }

    if (lodash.includes(['NewIncomingTx', 'NewOutgoingTx'], notification.type) && data.txid) {
      var networkAlias = self.ctx.Networks.get(wallet.network).alias;
      var urlTemplate = self.publicTxUrlTemplate[networkAlias];
      if (urlTemplate) {
        try {
          data.urlForTx = Mustache.render(urlTemplate, data);
        } catch (ex) {
          log.warn('Could not render public url for tx', ex);
        }
      }
    }

    return cb(null, data);
  });
};

EmailService.prototype._send = function(email, cb) {
  var self = this;

  var mailOptions = {
    from: email.from,
    to: email.to,
    subject: email.subject,
    text: email.bodyPlain,
  };
  if (email.bodyHtml) {
    mailOptions.html = email.bodyHtml;
  }
  self.mailer.sendMail(mailOptions, function(err, result) {
    if (err) {
      log.error('An error occurred when trying to send email to ' + email.to, err);
      return cb(err);
    }
    log.debug('Message sent: ', result || '');
    return cb(err, result);
  });
};

EmailService.prototype._readAndApplyTemplates = function(notification, emailType, recipientsList, cb) {
  var self = this;

  async.map(recipientsList, function(recipient, next) {
    async.waterfall([

      function(next) {
        self._getDataForTemplate(notification, recipient, next);
      },
      function(data, next) {
        async.map(['plain', 'html'], function(type, next) {
          self._loadTemplate(emailType, recipient, '.' + type, function(err, template) {
            if (err && type == 'html') return next();
            if (err) return next(err);
            self._applyTemplate(template, data, function(err, res) {
              return next(err, [type, res]);
            });
          });
        }, function(err, res) {
          return next(err, lodash.fromPairs(lodash.compact(res)));
        });
      },
      function(result, next) {
        next(null, result);
      },
    ], function(err, res) {
      next(err, [recipient.language, res]);
    });
  }, function(err, res) {
    return cb(err, lodash.fromPairs(lodash.compact(res)));
  });
};

EmailService.prototype._checkShouldSendEmail = function(notification, cb) {
  var self = this;

  if (notification.type != 'NewTxProposal') return cb(null, true);
  self.storage.fetchWallet(notification.walletId, function(err, wallet) {
    return cb(err, wallet.m > 1);
  });
};

EmailService.prototype.sendEmail = function(notification, cb) {
  var self = this;
  cb = cb || function() {};

  if (!MessageBroker.isNotificationForMe(notification, self.COIN)) {
    return cb();
  }

  var emailType = EMAIL_TYPES[notification.type];
  if (!emailType) return cb();

  self._checkShouldSendEmail(notification, function(err, should) {
    if (err) return cb(err);
    if (!should) return cb();

    self._getRecipientsList(notification, emailType, function(err, recipientsList) {
      if (lodash.isEmpty(recipientsList)) return cb();

      // TODO: Optimize so one process does not have to wait until all others are done
      // Instead set a flag somewhere in the db to indicate that this process is free
      // to serve another request.
      self.lock.runLocked('email-' + notification.id, cb, function(cb) {
        self.storage.fetchEmailByNotification(notification.id, function(err, email) {
          if (err) return cb(err);
          if (email) return cb();

          async.waterfall([

            function(next) {
              self._readAndApplyTemplates(notification, emailType, recipientsList, next);
            },
            function(contents, next) {
              async.map(recipientsList, function(recipient, next) {
                var content = contents[recipient.language];
                var email = Model.Email.create({
                  walletId: notification.walletId,
                  copayerId: recipient.copayerId,
                  from: self.from,
                  to: recipient.emailAddress,
                  subject: content.plain.subject,
                  bodyPlain: content.plain.body,
                  bodyHtml: content.html ? content.html.body : null,
                  notificationId: notification.id,
                });
                self.storage.storeEmail(email, function(err) {
                  return next(err, email);
                });
              }, next);
            },
            function(emails, next) {
              async.each(emails, function(email, next) {
                self._send(email, function(err) {
                  if (err) {
                    email.setFail();
                  } else {
                    email.setSent();
                  }
                  self.storage.storeEmail(email, next);
                });
              }, function(err) {
                return next();
              });
            },
          ], function(err) {
            if (err) {
              log.error('An error ocurred generating email notification', err);
            }
            return cb(err);
          });
        });
      });
    });
  });

};

module.exports = EmailService;
