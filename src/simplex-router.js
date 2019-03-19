const express = require('express')
const models = require('./models')
const sellApi = require('./sell')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_SELL_API_KEY)

const simplexRouter = express.Router()

const authenticateSimplex = (req, res, next) => {
  if (req.query._apikey !== process.env.SIMPLEX_PREST_API_KEY) {
    return res.status(401).json({res: null, err: 'unauthorized'})
  }
  next()
}

simplexRouter.use(authenticateSimplex)

simplexRouter.post('/send-crypto', async function (req, res) {
  const request = req.body
  let executionOrder
  try {
    const sellRequest = await models.sellRequest({txn_id: request.txn_id})
    const pendingSend = await models.executionOrders({sell_id: sellRequest.id}, {onlyPending: true})
    if (pendingSend.length) {
      throw new Error('already_exist')
    }
    executionOrder = await models.createExecutionOrder({...request, sell_id: sellRequest.id})
    await models.createSellEvent(sellRequest.id, 'approved')
  } catch (e) {
    console.error('Error in createExecutionOrder', e.message)
    return res.status(500).json({res: null, err: e.message})
  }
  try {
    await sellApi.notifyUser(request.txn_id, executionOrder.id)
  } catch (e) {
    console.error('Error in notify-user', {txn_id: request.txn_id, executionOrderId: executionOrder.id})
  }
  res.json(sellApi.executionOrderStatusEvent(executionOrder))
})

simplexRouter.post('/receive-crypto', async function (req, res) {
  const request = req.body
  try {
    const sellRequest = await models.sellRequest({txn_id: request.txn_id})
    await models.createSellEvent(sellRequest.id, 'refunded')
    const executionOrder = await models.executionOrder({sell_id: sellRequest.id})
    res.json(sellApi.cryptoCheckStatusEvent({
      id: executionOrder.id,
      status: 'completed',
      cryptoAmountReceived: executionOrder.cryptoAmountSent
    }))
  } catch (e) {
    console.error('Error in receive-crypto', e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

simplexRouter.get('/crypto-check-get-status', async function (req, res) {
  const executionOrderId = req.query.crypto_check_id
  try {
    const executionOrder = await models.executionOrder({id: executionOrderId})
    res.json(sellApi.cryptoCheckStatusEvent({
      id: executionOrder.id,
      status: 'completed',
      cryptoAmountReceived: executionOrder.cryptoAmountSent
    }))
  } catch (e) {
    console.error('crypto-check-get-status', e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

simplexRouter.get('/execution-order-get-status', async function (req, res) {
  const executionOrderId = req.query.execution_order_id
  try {
    const executionOrder = await models.executionOrder({id: executionOrderId})
    res.json(sellApi.executionOrderStatusEvent(executionOrder))
  } catch (e) {
    console.error('execution-order-get-status', e.message)
    res.status(500).json({res: null, err: e.message})
  }
})

module.exports = simplexRouter
