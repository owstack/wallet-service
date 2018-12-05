'use strict';

var chai = require('chai');
var sinon = require('sinon');
var should = chai.should();

var Service = require('../../');
var WalletService = Service.BTC.WalletService;

var owsCommon = require('@owstack/ows-common');
var async = require('async');
var BlockchainMonitor = WalletService.BlockchainMonitor;
var helpers = require('./helpers');
var log = require('npmlog');
var TestData = require('../testdata');
var lodash = owsCommon.deps.lodash;

log.debug = log.verbose;
log.level = 'info';

var storage;
var blockchainExplorer;

var socket = {
  handlers: {},
};

socket.on = function(eventName, handler) {
  this.handlers[eventName] = handler;
};

describe('Blockchain monitor', function() {
  var server, wallet;

  before(function(done) {
    helpers.before(done);
  });

  after(function(done) {
    helpers.after(server, done);
  });

  beforeEach(function(done) {
    helpers.beforeEach(function(err, res) {
      storage = res.storage;
      blockchainExplorer = res.blockchainExplorer;
      blockchainExplorer.initSocket = sinon.stub().returns(socket);

      helpers.createAndJoinWallet(2, 3, function(s, w) {
        server = s;
        wallet = w;

        var blockchainExplorers = {};
        blockchainExplorers['testnet'] = blockchainExplorer;
        blockchainExplorers['livenet'] = blockchainExplorer;

        var bcmonitor = new BlockchainMonitor({
          lockOpts: {},
          BTC: {
            messageBroker: server.getMessageBroker(),
            blockchainExplorers: blockchainExplorers
          }
        });

        bcmonitor.start({
          storage: storage
        }, function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });

  it('should notify copayers of incoming txs', function(done) {
    server.createAddress({}, function(err, address) {
      should.not.exist(err);

      var incoming = {
        txid: '123',
        vout: [{}],
      };
      incoming.vout[0][address.address] = 1500;
      socket.handlers['tx'](incoming);

      setTimeout(function() {
        server.getNotifications({}, function(err, notifications) {
          should.not.exist(err);
          var notification = lodash.find(notifications, {
            type: 'NewIncomingTx'
          });
          should.exist(notification);
          notification.walletId.should.equal(wallet.id);
          notification.data.txid.should.equal('123');
          notification.data.address.should.equal(address.address);
          notification.data.amount.should.equal(1500);
          done();
        });
      }, 100);
    });
  });

  it('should not notify copayers of incoming txs more than once', function(done) {
    server.createAddress({}, function(err, address) {
      should.not.exist(err);

      var incoming = {
        txid: '123',
        vout: [{}],
      };
      incoming.vout[0][address.address] = 1500;
      socket.handlers['tx'](incoming);
      setTimeout(function() {
        socket.handlers['tx'](incoming);

        setTimeout(function() {
          server.getNotifications({}, function(err, notifications) {
            should.not.exist(err);
            var notification = lodash.filter(notifications, {
              type: 'NewIncomingTx'
            });
            notification.length.should.equal(1);
            done();
          });
        }, 100);
      }, 50);
    });
  });

  it('should notify copayers of tx confirmation', function(done) {
    server.createAddress({}, function(err, address) {
      should.not.exist(err);

      var incoming = {
        txid: '123',
        vout: [{}],
      };
      incoming.vout[0][address.address] = 1500;

      server.txConfirmationSubscribe({
        txid: '123'
      }, function(err) {
        should.not.exist(err);

        blockchainExplorer.getTxidsInBlock = sinon.stub().callsArgWith(1, null, ['123', '456']);
        socket.handlers['block']('block1');

        setTimeout(function() {
          blockchainExplorer.getTxidsInBlock = sinon.stub().callsArgWith(1, null, ['123', '456']);
          socket.handlers['block']('block2');

          setTimeout(function() {
            server.getNotifications({}, function(err, notifications) {
              should.not.exist(err);
              var notifications = lodash.filter(notifications, {
                type: 'TxConfirmation'
              });
              notifications.length.should.equal(1);
              var n = notifications[0];
              n.walletId.should.equal(wallet.id);
              n.creatorId.should.equal(server.copayerId);
              n.data.txid.should.equal('123');
              done();
            });
          }, 50);
        }, 50);
      });
    });
  });
});
