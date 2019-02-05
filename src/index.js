require('dotenv').config()

const morgan = require('morgan')
const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const models = require('./models')
const buyApi = require('./buy')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_BUY_PARTNER_ID,
  process.env.SIMPLEX_BUY_API_KEY)
const sellApi = require('./sell')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_SELL_API_KEY)
const Ajv = require('ajv')
const simplexRouter = require('./simplex-router')

// Added request header to logging
morgan.token('x-forwarded-for', function (req, res) {
  return req.headers['x-forwarded-for']
})
const logFormat = ':x-forwarded-for [:date[clf]] ":method :url HTTP/:http-version" :status'

/* Setup json-schema parser */
const ajv = new Ajv()
const quoteSchema = require('./schemas/quote.json')
const partnerDataSchema = require('./schemas/partner-data.json')
const initiateSellSchema = require('./schemas/initiate-sell.json')
const executionOrderNotifyStatusSchema = require('./schemas/execution-order-notify-status.json')
ajv.addSchema(quoteSchema, 'quote')
ajv.addSchema(partnerDataSchema, 'partner-data')
ajv.addSchema(initiateSellSchema, 'initiate-sell')
ajv.addSchema(executionOrderNotifyStatusSchema, 'execution-order-notify-status')

const clientIp = (req) => {
  return process.env.IP_ADDRESS_OVERRIDE ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress
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
  const params = req.query.params || ''
  res.redirect(`edge-ret://plugins/simplex${params}`)
})

app.post('/quote', async function (req, res) {
  if (!ajv.validate('quote', req.body)) {
    return res.status(404).json({res: null, err: ajv.errors})
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
    res.status(500).json({res: null, err: e.message})
  }
})

app.post('/partner/data', async function (req, res) {
  if (!ajv.validate('partner-data', req.body)) {
    return res.status(404).json({res: null, err: ajv.errors})
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
    res.status(500).json({res: null, err: e.message})
  }
})

app.get('/payments/:userId/', async function (req, res) {
  try {
    const response = await models.payments(req.params.userId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})
app.get('/sells/:userId/', async function (req, res) {
  try {
    const response = await models.sells(req.params.userId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})
app.get('/sells/:userId/:sellId', async function (req, res) {
  try {
    const response = await models.sellEvents(req.params.userId, req.params.sellId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

app.get('/payments/:userId/:paymentId/', async function (req, res) {
  try {
    const response = await models.paymentEvents(req.params.userId, req.params.paymentId)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

app.post('/execution-order-notify-status', async function (req, res) {
  if (!ajv.validate('execution-order-notify-status', req.body)) {
    return res.status(404).json({res: null, err: ajv.errors})
  }
  const EXECUTION_ORDER_STATUS_MAPPING = ({
    failed: 'failed',
    cancelled: 'cancelled',
    completed: 'sent'
  })
  const {id, sellId, status, cryptoAmountSent, txnHash} = req.body
  await models.updateExecutionOrder(id, status, cryptoAmountSent, txnHash)
  await models.createSellEvent(sellId, EXECUTION_ORDER_STATUS_MAPPING[status])

  if (['failed', 'completed'].includes(status)) {
    await sellApi.notifyExecutionOrderStatus({id, status, cryptoAmountSent, txnHash})
  }
  res.send()
})

app.post('/sell/initiate/', async function (req, res) {
  if (!ajv.validate('initiate-sell', req.body)) {
    return res.status(404).json({res: null, err: ajv.errors})
  }
  try {
    const quote = req.body.quote
    const userId = req.body.user_id
    const transaction = await sellApi.initiateSell(req.body)
    if (transaction._error) {
      throw new Error(transaction._error)
    }
    const sellRequest = await models.createSellRequest({...transaction, ...quote, userId})
    await models.createSellEvent(sellRequest.id, 'submitted')
    res.json({res: transaction, err: null})
  } catch (e) {
    console.error(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

app.get('/execution-orders/:executionOrderId', async function (req, res) {
  try {
    const params = {}
    params.id = req.params.executionOrderId
    params.user_id = req.query.userId
    const response = await models.executionOrders(params)
    res.json({res: response[0], err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

app.get('/execution-orders/', async function (req, res) {
  try {
    const params = {}
    params.user_id = req.query.userId
    const onlyPending = req.query.onlyPending
    const response = await models.executionOrders(params, {onlyPending})
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

app.get('/sell/quote/', async function (req, res) {
  try {
    const response = await sellApi.getQuote(req)
    console.log(response)
    res.json({res: response, err: null})
  } catch (e) {
    console.log(e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

app.use('/simplex', simplexRouter)
app.listen(process.env.PORT)
