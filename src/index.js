require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const api = require('./api')(process.env.SIMPLEX_SANDBOX === 'true')
const Ajv = require('ajv')

/* Setup json-schema parser */
const ajv = new Ajv()
const schema = require('./schemas/quote.json')
ajv.addSchema(schema, 'quote')

if (!process.env.SIMPLEX_PARTNER_ID) {
  throw new Error("Missing SIMPLEX_PARTNER_ID. Please define in .env file")
}

if (!process.env.SIMPLEX_API_KEY) {
  throw new Error("Missing SIMPLEX_API_KEY. Please define in .env file")
}

const app = express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE')
  next()
})
app.post('/quote', async function (req, res) {
  console.log(req.body)
  if (!ajv.validate('quote', req.body)) {
    return res.json({res:null, err:ajv.errors})
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
    res.json({res:null, err:"Unable to handle request"})
  }
})

app.listen(3000)
