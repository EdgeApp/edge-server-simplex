require('dotenv').config()
const rp = require('request-promise')

const REFERER_URL = 'https://edge.app'

module.exports = function (sandbox, apiKey) {
  if (!apiKey) {
    throw new Error('Missing apiKey.')
  }
  const EDGE_SERVER_BASE_URL = sandbox
    ? 'https://simplex-sandbox-api.edgesecure.co'
    : 'https://simplex-api.edgesecure.co'

  const SIMPLEX_API_BASE = sandbox
    ? 'https://api.sandbox.test-simplexcc.com/v3'
    // ? 'http://localhost:3333/v3'
    : 'https://api.simplexcc.com/v3'

  const HEADERS = {
    Authorization: `apiKey ${apiKey}`
  }

  const encode = (params) => {
    const data = []
    for (const k in params) {
      if (params[k]) {
        data.push(k + '=' + encodeURIComponent(params[k]))
      }
    }
    return data.join('&')
  }

  const executionOrderStatusEvent = ({id, status, cryptoAmountSent, txnHash}) => {
    return {
      execution_order: {
        id,
        status: status,
        crypto_amount_sent: cryptoAmountSent,
        blockchain_txn_hash: txnHash
      }
    }
  }

  function getQuote (req, clientIp) {
    const data = encode(req.query)
    const options = {
      uri: `${SIMPLEX_API_BASE}/get-quote?` + data,
      method: 'GET',
      headers: HEADERS,
      json: true
    }
    console.log(options)
    return rp(options)
  }

  async function initiateSell (req) {
    const data = {
      referer_url: REFERER_URL,
      return_url: req.return_url,
      txn_details: {
        quote_id: req.quote.quote_id,
        refund_crypto_address: req.refund_crypto_address
      },
      account_details: {
        account_id: req.user_id
      }
    }
    const options = {
      uri: `${SIMPLEX_API_BASE}/initiate-sell`,
      method: 'POST',
      headers: HEADERS,
      body: data,
      json: true
    }
    console.log(options)
    return rp(options)
  }

  async function notifyUser (txnId, executionOrderId) {
    const options = {
      uri: `${SIMPLEX_API_BASE}/notify-user`,
      method: 'POST',
      headers: HEADERS,
      body: {
        txn_id: txnId,
        template_name: 'execution-order-deeplink',
        template_params: {
          deeplink: `${EDGE_SERVER_BASE_URL}/redirect?params=${encodeURI(`/sell/execution-orders/${executionOrderId}`)}`
        }
      },
      json: true
    }
    console.log(options)
    return rp(options)
  }
  async function notifyExecutionOrderStatus (executionOrder) {
    const options = {
      uri: `${SIMPLEX_API_BASE}/execution-order-notify-status`,
      method: 'POST',
      headers: HEADERS,
      body: executionOrderStatusEvent(executionOrder),
      json: true
    }
    console.log(options)
    return rp(options)
  }

  return {
    executionOrderStatusEvent,
    getQuote,
    initiateSell,
    notifyExecutionOrderStatus,
    notifyUser
  }
}
