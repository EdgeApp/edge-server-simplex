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
    ? 'https://api.test-simplexcc.com/v1'
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

  function getQuote(req, clientIp) {
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

  async function initiateSell(req, clientIp) {
    const data = {
      referer_url: REFERER_URL,
      return_url: req.body.return_url,
      txn_details: {
        quote_id: req.body.quote_id,
        refund_crypto_address: req.body.refund_crypto_address
      },
      account_details: {
        account_id: req.body.account_id,
      }
    }
    const options = {
      uri: `${API_BASE}/initiate-sell`,
      method: 'POST',
      headers: HEADERS,
      body: data,
      json: true
    }
    const res = await rp(options)
    const sellRequest = await models.SellRequest.create({
      quote_id: data.txn_details.quote_id,
      account_id: data.account_details.account_id,
      txn_id: res.txn_id,
      txn_url: res.txn_url
    })
    return res
  }

  async function userQueue(req) {
    let data = await models.SendCrypto({
      where: { account_id: req.params.userid }
    })
    return data
  }

  async function notifyUser(txnId) {
    const options = {
      uri: `${API_BASE}/notify-user`,
      method: 'POST',
      headers: HEADERS,
      data: {
        txn_id: txnId,
        template_name: 'execution-order-deeplink',
        template_params: {
          deeplink: 'edge://plugins/simplex'
        }
      },
      json: true
    }
    console.log(options)
    return rp(options)
  }

  async function messageAck(msgId) {
    const options = {
      uri: `${API_BASE}/msg/${msgId}/ack`,
      method: 'POST',
      headers: HEADERS,
      json: true
    }
    return rp(options)
  }

  async function syncMessages() {
    const options = {
      uri: `${API_BASE}/msg`,
      method: 'GET',
      headers: HEADERS,
      json: true
    }
    const res = await rp(options)
    console.log(JSON.stringify(res))
    for (let i = 0; i < res.length; ++i) {
      const m = res[i].msg
      const c = await models.SendCrypto.create({
        reason: m.reason,
        txn_id: m.txn_id,
        user_id: m.user_id,
        account_id: m.account_id,
        quote_id: m.account_id,
        crypto_currency: m.crypto_currency,
        crypto_amount_sent: m.crypto_amount,
        destination_crypto_address: m.destination_crypto_address
      })
      await messageAck(m.id)
      await notifyUser(m.txn_id)
    }
  }

  async function messageResponse(req) {
    const {execution_order_id, status, crypto_amount_sent, blockchain_txn_hash} = req.body
    const options = {
      uri: `${API_BASE}/msg/${req.params.msg_id}/response`,
      method: 'POST',
      headers: HEADERS,
      data: JSON.stringify({
        id: execution_order_id,
        execution_order_id: execution_order_id,
        status: status,
        crypto_amount_sent: crypto_amount_sent,
        blockchain_txn_hash: blockchain_txn_hash
      }),
      json: true
    }
    console.log(options)
    return rp(options)
  }

  return {
    getQuote, initiateSell,
    syncMessages, messageAck, messageResponse,
    userQueue
  }
}
