const config = {
    basePath: '/ws/api',
    port: 3232,
    ignoreRateLimiter: false,

    // Log levels; debug, warn, info, error
    log: {
        disable: true,
        level: process.env.LOG_LEVEL || 'info'
    },

    cluster: true,

    storageOpts: {
        mongoDb: {
            uri: process.env.DB_CONN_STRING || 'mongodb://localhost:27017/ws_test'
        }
    },

    lockOpts: {
        lockerServer: {
            host: process.env.LOCKER_SERVER_NAME || 'localhost',
            port: Number(process.env.LOCKER_SERVER_PORT) || 3231
        }
    },

    messageBrokerOpts: {
        port: Number(process.env.MESSAGE_BROKER_PORT) || 3380,
        // If using a remote service.
        messageBrokerServer: {
            url: process.env.MESSAGE_BROKER_URL || `http://localhost:${Number(process.env.MESSAGE_BROKER_PORT) || 3380}`
        }
    },

    emailOpts: {
        transport: {
            host: process.env.EMAIL_TRANSPORT_HOST || 'localhost',
            port: Number(process.env.EMAIL_TRANSPORT_PORT) || 25,
            ignoreTLS: process.env.EMAIL_TRANSPORT_IGNORE_TLS ? true : false
        },
        defaultLanguage: 'en',
        subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || '[Wallet Service]',
        from: process.env.EMAIL_FROM || 'wallet-service@owstack.com',
        templatePath: process.env.EMAIL_TEMPLATE_DIR || './base-service/lib/templates',
        publicTxUrlTemplate: {
            livenet: process.env.EMAIL_EXPLORER_URL_TEMPLATE || 'http://explorer.owstack.org/explorer/tx/{{txid}}',
            // testnet: 'http://explorer.owstack.org/explorer/tx/{{txid}}'
        }
    },

    // Sendgrid.
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    //
    // Add config:
    // mailer: sgMail,

    pushNotificationsOpts: {
        templatePath: './base-service/lib/templates',
        defaultLanguage: 'en',
        subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || '',
        pushServerUrl: 'https://fcm.googleapis.com/fcm',
        authorizationKeys: process.env.GOOGLE_FCM_AUTH_KEYS || ''
    },

    fiatRateServiceOpts: {
        provider: 'OpenWalletStack',
        fetchInterval: 60 // in minutes
    },

    // Each server (by coin network) has it's own configuration. Where the same services
    // run for each coin network the url's must be unique across all coin networks.

    BTC: {
        blockchainExplorerOpts: {
            defaultProvider: 'explorer',
            explorer: {
                // Multiple servers (in priority order)
                // url: ['http://a.b.c', 'https://test-explorer.owstack.com:443'],
                livenet: {
                    url: process.env.BTC_LIVENET_EXPLORER_API || 'https://btc.livenet.explorer-api.owstack.org',
                    apiPrefix: process.env.BTC_LIVENET_EXPLORER_API_PATH || ''
                }
            }
        }
    },

    BCH: {
        blockchainExplorerOpts: {
            defaultProvider: 'explorer',
            explorer: {
                // Multiple servers (in priority order)
                // url: ['http://a.b.c', 'https://test-explorer.owstack.com:443'],
                livenet: {
                    url: process.env.BCH_LIVENET_EXPLORER_API || 'http://bch.livenet.explorer-api.owstack.org',
                    apiPrefix: process.env.BCH_LIVENET_EXPLORER_API_PATH || ''
                }
            }
        }
    },

    LTC: {
        blockchainExplorerOpts: {
            defaultProvider: 'explorer',
            explorer: {
                // Multiple servers (in priority order)
                // url: ['http://a.b.c', 'https://test-explorer.owstack.com:443'],
                livenet: {
                    url: process.env.LTC_LIVENET_EXPLORER_API || 'http://ltc.livenet.explorer-api.owstack.org',
                    apiPrefix: process.env.LTC_LIVENET_EXPLORER_API_PATH || ''
                }
            }
        }
    }

};

module.exports = config;
