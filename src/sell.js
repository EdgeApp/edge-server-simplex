const rp = require('request-promise');
const models = require('./models')

const REFERER_URL = "https://edge.app"

module.exports = function (sandbox, partnerId, apiKey) {
  if (!partnerId) {
    throw new Error("Missing partnerId.")
  }
  if (!apiKey) {
    throw new Error("Missing apiKey.")
  }

  const API_BASE = sandbox
    // ? 'https://sell-sandbox.test-simplexcc.com/v1'
    // ? 'https://api.test-simplexcc.com/v1'
    // ? 'https://api.sandbox.test-simplexcc.com/v1'
    ? 'http://localhost:3333/v1'
    : 'https://api.simplexcc.com/v1';

  const HEADERS = {
    Authorization: `apiKey ${apiKey}`
  }

  const encode = (params) => {
    let data = []
    for (var k in params) {
      if (params[k]) {
        data.push(k + '=' + params[k])
      }
    }
    return data.join('&')
  }

  const sendCryptoStatusEvent = (sendCryptoId, status, cryptoAmountSent, txnHash) => {
    return {
      execution_order: {
        id: sendCryptoId,
        status: status,
        crypto_amount_sent: cryptoAmountSent,
        blockchain_txn_hash: txnHash
      }
    }
  }

  function getQuote (req, clientIp) {
    const data = encode(req.query)
    const options = {
      uri: `${API_BASE}/get-quote?` + data,
      method: 'GET',
      headers: HEADERS,
      json: true
    }
    console.log(options)
    return rp(options)
  }

  async function initiateSell (req, clientIp) {
    const quoteId = req.body.quote_id
    const accountId = req.body.account_id
    const data = {
      referer_url: REFERER_URL,
      return_url: req.body.return_url,
      txn_details: {
        quote_id: quoteId,
        refund_crypto_address: req.body.refund_crypto_address
      },
      account_details: {
        account_id: accountId
      }
    }
    const options = {
      uri: `${API_BASE}/initiate-sell`,
      method: 'POST',
      headers: HEADERS,
      body: data,
      json: true
    }
    console.log(options)
    const res = await rp(options)
    await models.createSellRequest({...res, quoteId, accountId})
    return res
  }

  // async function userQueue (req) {
  //   const data = await models.SendCrypto({
  //     where: { account_id: req.params.userid }
  //   })
  //   return data
  // }

  async function notifyUser (txnId, sendCryptoRequestId) {
    const options = {
      uri: `${API_BASE}/notify-user`,
      method: 'POST',
      headers: HEADERS,
      body: {
        txn_id: txnId,
        template_name: 'execution-order-deeplink',
        template_params: {
          deeplink: `http://localhost:3000/#/sell/send-crypto-requests/${sendCryptoRequestId}`
        }
      },
      json: true
    }
    console.log(options)
    return rp(options)
  }
  async function notifySendCryptoStatus (sendCryptoRequest) {
    const {sendCryptoId, status, cryptoAmountSent, txnHash} = sendCryptoRequest
    const options = {
      uri: `${API_BASE}/execution-order-notify-status`,
      method: 'POST',
      headers: HEADERS,
      body: sendCryptoStatusEvent(sendCryptoId, status, cryptoAmountSent, txnHash),
      json: true
    }
    console.log(options)
    return rp(options)
  }
  //
  // async function messages () {
  //   const options = {
  //     uri: `${API_BASE}/msg`,
  //     method: 'GET',
  //     headers: HEADERS,
  //     json: true
  //   }
  //   return rp(options)
  // }
  //
  // async function messageResponse (req) {
  //   const {execution_order_id, status, crypto_amount_sent, blockchain_txn_hash} = req.body
  //   const options = {
  //     uri: `${API_BASE}/msg/${req.params.msg_id}/response`,
  //     method: 'POST',
  //     headers: HEADERS,
  //     data: JSON.stringify({
  //       id: execution_order_id,
  //       execution_order_id: execution_order_id,
  //       status: status,
  //       crypto_amount_sent: crypto_amount_sent,
  //       blockchain_txn_hash: blockchain_txn_hash
  //     }),
  //     json: true
  //   }
  //   console.log(options)
  //   return rp(options)
  // }
  //
  // async function messageAck (req) {
  //   const options = {
  //     uri: `${API_BASE}/msg/${req.params.msg_id}/ack`,
  //     method: 'POST',
  //     headers: HEADERS,
  //     json: true
  //   }
  //   return rp(options)
  // }

  return {
    getQuote,
    initiateSell,
    notifySendCryptoStatus,
    notifyUser
  }
}
