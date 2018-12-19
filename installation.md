The following document is a step-by-step guide to run wallet-service.

### Prerequisites
Ensure MongoDB (2.6+) is installed and running. This document assumes that mongod is running at the default port 27017.
See the configuration section to configure a different host/port.

### Install Wallet Service from NPM
Use the following steps to Install wallet-service from the npmjs repository and run it with defaults. To change configuration before running, see the Configuration section.
```bash
npm install @owstack/wallet-service
cd wallet-service
```

### Install wallet-service from github source
Use the following steps to Install wallet-service from github source and run it with defaults. To change configuration before running, see the Configuration section.
```bash
git clone https://github.com/owstack/wallet-service.git
cd wallet-service
npm install
```

### Start the wallet-service
Start all services for all supported coin networks.
```bash
npm start all
```
Start services for a specific coin network.
```bash
npm start [ btc | bch | ltc ]
```

### Run tests
Use the following to run tests
```bash
npm test
```
Use the following to run coverage during testing
```bash
npm run coverage
```
or
```bash
make
```

### Configuration
Configuration for all required modules can be specified in https://github.com/owstack/wallet-service/blob/master/base-service/config.js

The wallet-service is composed of the following separate node services:

One global instance of each:
* Fiat Rate Service - base-service/fiatrateservice/fiatrateservice.js
* Locker - base-service/locker/locker.js
* Message Broker - base-service/messagebroker/messagebroker.js
* Wallet Service - base-service/ws.js

One instance of each per coin network:
* Blockchain Monitor - service-template/bcmonitor/bcmonitor.js (This service talks to the Blockchain Explorer service configured under blockchainExplorerOpts - see Configure blockchain service below.)
* Email Service - service-template/emailservice/emailservice.js
* Push Notifications Service - service-template/pushnotificationsservice/pushnotificationsservice.js

#### Configure MongoDB
Example configuration for connecting to the MongoDB instance:
```javascript
  storageOpts: {
    mongoDb: {
      uri: 'mongodb://localhost:27017/ws',
    },
  }
```

#### Configure Locker service
Example configuration for connecting to locker service:
```javascript
  lockOpts: {
    lockerServer: {
      host: 'localhost',
      port: 3231,
    },
  }
```

#### Configure Message Broker service
Example configuration for connecting to message broker service:
```javascript
  messageBrokerOpts: {
    messageBrokerServer: {
      url: 'http://localhost:3380',
    },
  }
```

#### Configure blockchain service
Note: this service will be used by blockchain monitor service as well as by wallet-service itself.
An example of this configuration is:
```javascript
  blockchainExplorerOpts: {
    defaultProvider: 'explorer',

    // Providers
    'explorer': {
      'livenet': {
        url: 'https://explorer.openwalletstack.com:443',
        apiPrefix: '/explorer-api'
      },
      'testnet': {
        url: 'https://test-explorer.openwalletstack.com:443',
        apiPrefix: '/explorer-api'
      }
    }
  }
```

#### Configure Email service
Example configuration for connecting to email service (using postfix):
```javascript
  emailOpts: {
    host: 'localhost',
    port: 25,
    ignoreTLS: true,
    subjectPrefix: '[Wallet Service]',
    from: 'wallet-service@openwalletstack.com',
  }
```

#### Enable clustering
Change `config.js` file to enable and configure clustering:
```javascript
{
  cluster: true,
  clusterInstances: 4,
}
```
