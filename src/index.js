require('dotenv').config()

const morgan = require('morgan')
const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const models = require('./models')
const buyApi = require('./buy')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_PARTNER_ID,
  process.env.SIMPLEX_API_KEY)
const sellApi = require('./sell')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_PARTNER_ID,
  process.env.SIMPLEX_SELL_API_KEY)
const Ajv = require('ajv')

// Added request header to logging
morgan.token('x-forwarded-for', function (req, res) {
  return req.headers['x-forwarded-for']
})
const logFormat = ':x-forwarded-for [:date[clf]] ":method :url HTTP/:http-version" :status'

/* Setup json-schema parser */
const ajv = new Ajv()
const quoteSchema = require('./schemas/quote.json')
const partnerDataSchema = require('./schemas/partner-data.json')
const initiateSell = require('./schemas/initiate-sell.json')
const messageResponse = require('./schemas/message-response.json')
ajv.addSchema(quoteSchema, 'quote')
ajv.addSchema(partnerDataSchema, 'partner-data')
ajv.addSchema(messageResponse, 'message-response')
ajv.addSchema(initiateSell, 'initiate-sell')

const clientIp = (req) => {
  return process.env.IP_ADDRESS_OVERRIDE
    || req.headers['x-forwarded-for']
    || req.connection.remoteAddress
}

const authenticateSimplex = (req, res, next) => {
  if (req.query._apikey === process.env.EDGE_API_KEY) {
    next()
  } else {
    return res.status(403).json({res: null, err: 'unauthorized'})
  }
}
const app = express()
app.use(cors())
app.use(morgan(logFormat))
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE')
  next()
})
app.get('/redirect', function (req, res) {
  res.redirect('edge-ret://plugins/simplex')
})

app.post('/quote', async function (req, res) {
  if (!ajv.validate('quote', req.body)) {
    return res.status(403).json({res: null, err: ajv.errors})
  }
  try {
    const response = await buyApi.getQuote(
      req.body.digital_currency,
      req.body.fiat_currency,
      req.body.requested_currency,
      req.body.requested_amount,
      req.body.client_id,
      clientIp(req)
    )
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res: null, err: e.message})
  }
})

app.post('/partner/data', async function (req, res) {
  if (!ajv.validate('partner-data', req.body)) {
    return res.status(403).json({res: null, err: ajv.errors})
  }
  try {
    const response = await buyApi.getPartnerData(
      req.body, clientIp(req))
    await models.requestCreate(
      req.body.account_details.app_end_user_id,
      req.body.transaction_details.payment_details)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res: null, err: e.message})
  }
})

app.get('/payments/:userId/', async function (req, res) {
  try {
    const response = await models.payments(req.params.userId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res: null, err: e.message})
  }
})

app.get('/payments/:userId/:paymentId/', async function (req, res) {
  try {
    const response = await models.events(req.params.userId, req.params.paymentId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res: null, err: e.message})
  }
})

function wrap (method, path, validator, cb) {
  app[method](path, async function (req, res) {
    if (validator && !ajv.validate(validator, req.body)) {
      return res.status(403).json({res: null, err: ajv.errors})
    }
    try {
      const response = await cb(req, clientIp(req))
      console.log(response)
      res.json({res: response, err: null})
    } catch (e) {
      console.log(e.message)
      res.status(403).json({
        res: null, err: e.message
      })
    }
  })
}

app.post('/send-crypto', authenticateSimplex, async function (req, res) {
  const request = req.body
  const sendCryptoRequest = await models.createSendCryptoRequest(request)
  await sellApi.notifyUser(request.txn_id, sendCryptoRequest.id)
  res.json({
    'execution_order': {
      'id': sendCryptoRequest.id,
      'status': 'pending'
    }
  })
})

app.post('/send-crypto-completed', async function (req, res) {
  const {sendCryptoId, status, cryptoAmountSent, txnHash} = req.body
  await models.updateSendCrypto(sendCryptoId, status, cryptoAmountSent, txnHash)
  await sellApi.notifySendCryptoStatus({sendCryptoId, status, cryptoAmountSent, txnHash})
  res.send()
})

app.get('/sendCryptoRequests/', async function (req, res) {
  try {
    const response = await models.sendCryptoRequest(req.query.sendCryptoId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res: null, err: e.message})
  }
})
wrap('get', '/sell/quote/', null, sellApi.getQuote)
// TODO define a schema validator
wrap('post', '/sell/initiate/', 'initiate-sell', sellApi.initiateSell)

wrap('get', '/sell/message/:user_id/', null, sellApi.userQueue)
wrap('post', '/sell/message/:user_id/:msg_id/ack', null, sellApi.messageAck)
wrap('post', '/sell/message/:user_id/:msg_id/response', 'message-response', sellApi.messageResponse)

app.listen(process.env.PORT)
