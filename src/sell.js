const rp = require('request-promise');

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

  function initiateSell(req, clientIp) {
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
    console.log(options)
    return rp(options)
  }

  async function userQueue(req) {
    let data = await messages()
    return data.messages
  }

  async function notifyUser(req) {
    const options = {
      uri: `${API_BASE}/notify-user`,
      method: 'POST',
      headers: HEADERS,
      data: {
        txn_id: req.params.txn_id,
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

  async function messages() {
    const options = {
      uri: `${API_BASE}/msg`,
      method: 'GET',
      headers: HEADERS,
      json: true
    }
    return rp(options)
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

  async function messageAck(req) {
    const options = {
      uri: `${API_BASE}/msg/${req.params.msg_id}/ack`,
      method: 'POST',
      headers: HEADERS,
      json: true
    }
    return rp(options)
  }

  return {
    getQuote, initiateSell,
    messages, messageAck, messageResponse,
    userQueue, notifyUser
  }
}
