'use strict';

var config = {
  basePath: '/ws/api',
  disableLogs: false,
  port: 3232,
  ignoreRateLimiter: false,

  // Uncomment to make wallet-service a forking server
  // cluster: true,

  // Uncomment to set the number or process (will use the nr of availalbe CPUs by default)
  // clusterInstances: 4,

  // https: true,
  // privateKeyFile: 'private.pem',
  // certificateFile: 'cert.pem',
  ////// The following is only for certs which are not
  ////// trusted by nodejs 'https' by default
  ////// CAs like Verisign do not require this
  // CAinter1: '', // ex. 'COMODORSADomainValidationSecureServerCA.crt'
  // CAinter2: '', // ex. 'COMODORSAAddTrustCA.crt'
  // CAroot: '', // ex. 'AddTrustExternalCARoot.crt'

  storageOpts: {
    mongoDb: {
      uri: 'mongodb://localhost:27017/btcws'
    }
  },
/*
  lockOpts: {
    //  To use locker-server, uncomment this:
    lockerServer: {
      host: 'localhost',
      port: 3231
    }
  },

  messageBrokerOpts: {
    messageBrokerServer: {
      url: 'http://localhost:3380'
    }
  },
*/
  pushNotificationsOpts: {
    templatePath: './lib/templates',
    defaultLanguage: 'en',
    defaultUnit: 'BTC',
    subjectPrefix: '',
    pushServerUrl: 'https://fcm.googleapis.com/fcm',
    authorizationKey: ''
  },

  fiatRateServiceOpts: {
    defaultProvider: 'BitPay',
    fetchInterval: 60 // in minutes
  },

  // To use sendgrid for sending email notifications:
  // var sgTransport = require('nodemail-sendgrid-transport');
  // mailer:sgTransport({
  //  api_user: xxx,
  //  api_key: xxx,
  // });

  // Each server (by coin network) has it's own configuration. Where the same services
  // run for each coin network the url's must be unique across all coin networks.

  BTC: {
    blockchainExplorerOpts: {
      defaultProvider: 'explorer',
      explorer: {
        // Multiple servers (in priority order)
        // url: ['http://a.b.c', 'https://test-explorer.openwalletstack.com:443'],
        livenet: {
          url: 'http://btc.owstack.org:3001',
          apiPrefix: '/explorer-api'
        },
        testnet: {
          url: 'https://test-insight.bitpay.com',
          apiPrefix: '/api'
        }
      }
    },

    // To use email notifications:
    // emailOpts: {
    //  host: 'localhost',
    //  port: 25,
    //  ignoreTLS: true,
    //  subjectPrefix: '[Wallet Service]',
    //  from: 'wallet-service@btc.io',
    //  templatePath: './lib/templates',
    //  defaultLanguage: 'en',
    //  defaultUnit: 'BTC',
    //  publicTxUrlTemplate: {
    //    'livenet': 'https://explorer.openwalletstack.com/tx/{{txid}}',
    //    'testnet': 'https://test-explorer.openwalletstack.com/tx/{{txid}}',
    //  },
    //},

  },

  BCH: {
    // todo
  },

  LTC: {
    // todo
  }

};

module.exports = config;
