Wallet Service
======

[![NPM Package](https://img.shields.io/npm/v/@owstack/wallet-service.svg?style=flat-square)](https://www.npmjs.org/package/@owstack/wallet-service)
[![Build Status](https://img.shields.io/travis/com/owstack/wallet-service.svg?branch=master&style=flat-square)](https://travis-ci.com/owstack/wallet-service)
[![Coverage Status](https://img.shields.io/coveralls/owstack/wallet-service.svg?style=flat-square)](https://coveralls.io/r/owstack/wallet-service)

A multisignature HD Bitcoin wallet service.

# Description

The wallet-service facilitates multisig HD wallets creation and operation through a (hopefully) simple and intuitive REST API.

The wallet-service can usually be installed within minutes and accommodates all the needed infrastructure for peers in a multisig wallet to communicate and operate – with minimum server trust.

See [wallet-client](https://github.com/owstack/wallet-client) for the client library that communicates to wallet-service and verifies its response. Also check [wallet-cli](https://github.com/owstack/wallet-cli) for a simple command line wallet implementation that relays on wallet-service.

# Getting Started
```
 git clone https://github.com/owstack/wallet-service.git
 cd wallet-service && npm start
```

This will launch the wallet-service (with default settings) at `http://localhost:3232/ws/api`.

The wallet-sevice needs mongoDB. You can configure the connection at `config.js`

The wallet-service supports SSL and Clustering. For a detailed guide on installing the wallet-service with extra features see [Installing Wallet Service](https://github.com/owstack/wallet-service/blob/master/installation.md).

The wallet-service uses by default a Request Rate Limitation to CreateWallet endpoint. If you need to modify it, check defaults.js' `Defaults.RateLimit`

# Security Considerations
 * Private keys are never sent to the wallet-service, wallets store them locally.
 * Extended public keys are stored on the wallet-service. This allows the wallet-service to easily check wallet balance, send offline notifications to copayers, etc.
 * During wallet creation, the initial copayer creates a wallet secret that contains a private key. All copayers need to prove they have the secret by signing their information with this private key when joining the wallet. The secret should be shared using secured channels.
 * A copayer could join the wallet more than once, and there is no mechanism to prevent this. See [wallet-cli](https://github.com/owstack/wallet-cli)'s confirm command, for a method for confirming copayers.
 * All wallet-service responses are verified:
 ** Addresses and change addresses are derived independently and locally by the copayers from their local data.
 ** TX Proposals templates are signed by copayers and verified by others, so the wallet-service cannot create or tamper with them.

# REST API
## Authentication

  In order to access a wallet, clients are required to send the headers:
```
  x-identity
  x-signature
```
Identity is the Peer-ID, this will identify the peer and its wallet. Signature is the current request signature, using `requestSigningKey`, the `m/1/1` derivative of the Extended Private Key.

See [Wallet Client](https://github.com/owstack/wallet-client/blob/master/lib/api.js) for implementation details.

## GET Endpoints
`/v1/wallets/`: Get wallet information

Returns:
 * Wallet object. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/wallet.js)).

`/v1/txhistory/`: Get Wallet's transaction history

Optional Arguments:
 * skip: Records to skip from the result (defaults to 0)
 * limit: Total number of records to return (return all available records if not specified).

Returns:
 * History of incoming and outgoing transactions of the wallet. The list is paginated using the `skip` & `limit` params. Each item has the following fields:
 * action ('sent', 'received', 'moved')
 * amount
 * fees
 * time
 * addressTo
 * confirmations
 * proposalId
 * creatorName
 * message
 * actions array ['createdOn', 'type', 'copayerId', 'copayerName', 'comment']


`/v1/txproposals/`:  Get Wallet's pending transaction proposals and their status
Returns:
 * List of pending TX Proposals. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/txproposal.js))

`/v1/addresses/`: Get Wallet's main addresses (does not include change addresses)

Returns:
 * List of Addresses object: (https://github.com/owstack/wallet-service/blob/master/lib/model/address.js)).  This call is mainly provided so the client check this addresses for incoming transactions (using a service like [Explorer](https://github.com/owstack/ows-explorer)

`/v1/balance/`:  Get Wallet's balance

Returns:
 * totalAmount: Wallet's total balance
 * lockedAmount: Current balance of outstanding transaction proposals, that cannot be used on new transactions.
 * availableAmount: Funds available for new proposals.
 * totalConfirmedAmount: Same as totalAmount for confirmed UTXOs only.
 * lockedConfirmedAmount: Same as lockedAmount for confirmed UTXOs only.
 * availableConfirmedAmount: Same as availableAmount for confirmed UTXOs only.
 * byAddress array ['address', 'path', 'amount']: A list of addresses holding funds.
 * totalKbToSendMax: An estimation of the number of KiB required to include all available UTXOs in a tx (including unconfirmed).

`/v1/txnotes/:txid`:  Get user notes associated to the specified transaction.
Returns:
 * The note associated to the `txid` as a string.

`/v1/fiatrates/:code`:  Get the fiat rate for the specified ISO 4217 code.
Optional Arguments:
 * provider: An identifier representing the source of the rates.
 * ts: The timestamp for the fiat rate (defaults to now).

Returns:
 * The fiat exchange rate.

## POST Endpoints
`/v1/wallets/`: Create a new Wallet

 Required Arguments:
 * name: Name of the wallet
 * m: Number of required peers to sign transactions
 * n: Number of total peers on the wallet
 * pubKey: Wallet Creation Public key to check joining copayer's signatures (the private key is unknown by wallet-service and must be communicated
  by the creator peer to other peers).

Returns:
 * walletId: Id of the new created wallet

`/v1/wallets/:id/copayers/`: Join a Wallet in creation

Required Arguments:
 * walletId: Id of the wallet to join
 * name: Copayer Name
 * xPubKey - Extended Public Key for this copayer.
 * requestPubKey - Public Key used to check requests from this copayer.
 * copayerSignature - Signature used by other copayers to verify that the copayer joining knows the wallet secret.

Returns:
 * copayerId: Assigned ID of the copayer (to be used on x-identity header)
 * wallet: Object with wallet's information

`/v1/txproposals/`: Add a new transaction proposal

Required Arguments:
 * toAddress: RCPT Bitcoin address.
 * amount: amount (in satoshis) of the mount proposed to be transfered
 * proposalsSignature: Signature of the proposal by the creator peer, using prososalSigningKey.
 * (opt) message: Encrypted private message to peers.
 * (opt) payProUrl: Paypro URL for peers to verify TX
 * (opt) feePerKb: Use an alternative fee per KB for this TX.
 * (opt) excludeUnconfirmedUtxos: Do not use UTXOs of unconfirmed transactions as inputs for this TX.

Returns:
 * TX Proposal object. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/txproposal.js)). `.id` is probably needed in this case.

`/v1/addresses/`: Request a new main address from wallet

Returns:
 * Address object: (https://github.com/owstack/wallet-service/blob/master/lib/model/address.js)). Note that `path` is returned so client can derive the address independently and check server's response.

`/v1/txproposals/:id/signatures/`: Sign a transaction proposal

Required Arguments:
 * signatures:  All Transaction's input signatures, in order of appearance.

Returns:
 * TX Proposal object. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/txproposal.js)). `.status` is probably needed in this case.

`/v1/txproposals/:id/broadcast/`: Broadcast a transaction proposal

Returns:
 * TX Proposal object. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/txproposal.js)). `.status` is probably needed in this case.

`/v1/txproposals/:id/rejections`: Reject a transaction proposal

Returns:
 * TX Proposal object. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/txproposal.js)). `.status` is probably needed in this case.

`/v1/addresses/scan`: Start an address scan process looking for activity.

 Optional Arguments:
 * includeCopayerBranches: Scan all copayer branches following BIP45 recommendation (defaults to false).

`/v1/txconfirmations/`: Subscribe to receive push notifications when the specified transaction gets confirmed.
Required Arguments:
 * txid:  The transaction to subscribe to.

## PUT Endpoints
`/v1/txnotes/:txid/`: Modify a note for a tx.

## DELETE Endpoints
`/v1/txproposals/:id/`: Deletes a transaction proposal. Only the creator can delete a TX Proposal, and only if it has no other signatures or rejections

 Returns:
 * TX Proposal object. (see [fields on the source code](https://github.com/owstack/wallet-service/blob/master/lib/model/txproposal.js)). `.id` is probably needed in this case.

`/v1/txconfirmations/:txid`: Unsubscribe from transaction `txid` and no longer listen to its confirmation.

# Push Notifications
  Recomended to complete config.js file:

  * [GCM documentation to get your API key](https://developers.google.com/cloud-messaging/gcm)
  * [Apple's Notification guide to know how to get your certificates for APN](https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Chapters/Introduction.html)

## POST Endpoints
`/v1/pushnotifications/subscriptions/`: Adds subscriptions for push notifications service at database.

## DELETE Endopints
`/v1/pushnotifications/subscriptions/`: Remove subscriptions for push notifications service from database.
