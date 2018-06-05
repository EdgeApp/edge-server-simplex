require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const api = require('./api')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_PARTNER_ID,
  process.env.SIMPLEX_API_KEY)
const Ajv = require('ajv')

/* Setup json-schema parser */
const ajv = new Ajv()
const quoteSchema = require('./schemas/quote.json')
const partnerDataSchema = require('./schemas/partner-data.json')
ajv.addSchema(quoteSchema, 'quote')
ajv.addSchema(partnerDataSchema, 'partner-data')

const app = express()
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
  console.log(req.body)
  if (!ajv.validate('quote', req.body)) {
    return res.status(403).json({res:null, err:ajv.errors})
  }
  const client_ip = process.env.IP_ADDRESS_OVERRIDE
                 || req.headers['x-forwarded-for']
                 || req.connection.remoteAddress
  try {
    const response = await api.getQuote(
      req.body.digital_currency,
      req.body.fiat_currency,
      req.body.requested_currency,
      req.body.requested_amount,
      req.body.client_id,
      client_ip
    )
    res.json({res:response, err:null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res:null, err:e.message})
  }
})

app.post('/partner/data', async function (req, res) {
  if (!ajv.validate('partner-data', req.body)) {
    return res.status(403).json({res:null, err:ajv.errors})
  }
  const client_ip = process.env.IP_ADDRESS_OVERRIDE
                 || req.headers['x-forwarded-for']
                 || req.connection.remoteAddress
  try {
    const response = await api.getPartnerData(req.body, client_ip)
    res.json({res:response, err:null})
  } catch (e) {
    console.log(e.message)
    res.status(403).json({res:null, err:e.message})
  }
})

app.listen(3000)
