const Sequelize = require('sequelize')
const Op = Sequelize.Op
const uuid = require('uuid/v4')

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    pool: { max: 5, min: 0, idle: 10000 },
    omitNull: true
  })

const PaymentRequest = sequelize.define('payment_requests', {
  payment_id: {
    primaryKey: true,
    type: Sequelize.STRING,
    allowNull: false
  },
  quote_id: {
    type: Sequelize.STRING,
    allowNull: true
  },
  order_id: {
    type: Sequelize.STRING,
    allowNull: true
  },
  fiat_total_amount: {
    type: Sequelize.STRING
  },
  fiat_currency: {
    type: Sequelize.STRING
  },
  requested_digital_amount: {
    type: Sequelize.STRING
  },
  requested_digital_currency: {
    type: Sequelize.STRING
  },
  payment_status: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: 'notsubmitted'
  },
  user_id: {
    type: Sequelize.STRING
  }
})

const PaymentEvent = sequelize.define('payments_events', {
  id: {
    primaryKey: true,
    type: Sequelize.STRING,
    allowNull: false
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  payment_status: {
    type: Sequelize.STRING,
    allowNull: true
  },
  payment_created_at: {
    type: Sequelize.DATE
  },
  payment_updated_at: {
    type: Sequelize.DATE
  },
  fiat_total_amount: {
    type: Sequelize.STRING
  },
  fiat_currency: {
    type: Sequelize.STRING
  },
  user_id: {
    type: Sequelize.STRING
  },
  payment_id: {
    references: {
      model: PaymentRequest,
      key: 'payment_id'
    },
    type: Sequelize.STRING,
    allowNull: true
  }
}, { timestamps: false })

const SellRequest = sequelize.define('sell_requests', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    allowNull: false
  },
  txn_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  txn_url: {
    type: Sequelize.STRING,
    allowNull: false
  },
  crypto_amount: {
    type: Sequelize.STRING,
    allowNull: false
  },
  crypto_currency: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fiat_amount: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fiat_currency: {
    type: Sequelize.STRING,
    allowNull: false
  },
  status: {
    type: Sequelize.STRING,
    allowNull: true
  },
  quote_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  user_id: {
    type: Sequelize.STRING,
    allowNull: false
  }
})

const SellEvent = sequelize.define('sell_events', {
  id: {
    primaryKey: true,
    type: Sequelize.STRING,
    allowNull: false
  },
  sell_status: {
    type: Sequelize.STRING,
    allowNull: false
  },
  sell_id: {
    references: {
      model: SellRequest,
      key: 'id'
    },
    type: Sequelize.UUID,
    allowNull: true
  }
})

const ExecutionOrder = sequelize.define('execution_order', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    allowNull: false
  },
  reason: {
    type: Sequelize.STRING,
    allowNull: true
  },
  simplex_user_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  user_id: {
    type: Sequelize.STRING,
    allowNull: true
  },
  quote_id: {
    type: Sequelize.STRING,
    allowNull: true
  },
  crypto_currency: {
    type: Sequelize.STRING,
    allowNull: true
  },
  crypto_amount: {
    type: Sequelize.STRING,
    allowNull: true
  },
  destination_crypto_address: {
    type: Sequelize.STRING,
    allowNull: true
  },
  sell_id: {
    type: Sequelize.UUID,
    allowNull: false
  },
  crypto_amount_sent: {
    type: Sequelize.STRING,
    allowNull: true
  },
  blockchain_txn_hash: {
    type: Sequelize.STRING,
    allowNull: true
  },
  sent_at: {
    type: Sequelize.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: Sequelize.DATE,
    allowNull: true
  },
  failed_at: {
    type: Sequelize.DATE,
    allowNull: true
  },
  freezeTableName: true,
  tableName: 'execution_order'

})
async function migrate () {
  await PaymentRequest.sync({force: true})
  await PaymentEvent.sync({force: true})
  await SellRequest.sync({force: true})
  await SellEvent.sync({force: true})
  await ExecutionOrder.sync({force: true})
}

function serializePayment (data) {
  return {
    created_at: data.createdAt,
    status: data.payment_status,
    payment_id: data.payment_id,
    quote_id: data.quote_id,
    order_id: data.order_id,
    fiat_total_amount: data.fiat_total_amount,
    fiat_currency: data.fiat_currency,
    requested_digital_amount: data.requested_digital_amount,
    requested_digital_currency: data.requested_digital_currency
  }
}
function serializeSell (data) {
  return {
    created_at: data.createdAt,
    status: data.status,
    url: data.txn_url,
    id: data.id,
    quote_id: data.quote_id,
    fiat_total_amount: data.fiat_amount,
    fiat_currency: data.fiat_currency,
    requested_digital_amount: data.crypto_amount,
    requested_digital_currency: data.crypto_currency
  }
}

function getExecutionOrderStatus (executionOrder) {
  if (executionOrder.failed_at) {
    return 'failed'
  }
  if (executionOrder.cancelled_at) {
    return 'cancelled'
  }
  if (executionOrder.sent_at) {
    return 'completed'
  }
  return 'pending'
}
function serializeExecutionOrder (executionOrder) {
  return {
    id: executionOrder.id,
    sell_id: executionOrder.sell_id,
    created_at: executionOrder.createdAt,
    sent_at: executionOrder.sent_at,
    cancelled_at: executionOrder.cancelled_at,
    status: getExecutionOrderStatus(executionOrder),
    failed_at: executionOrder.failed_at,
    destination_crypto_address: executionOrder.destination_crypto_address,
    fiat_total_amount: executionOrder.fiat_amount,
    fiat_currency: executionOrder.fiat_currency,
    requested_digital_amount: executionOrder.crypto_amount,
    cryptoAmountSent: executionOrder.crypto_amount_sent,
    txnHash: executionOrder.blockchain_txn_hash,
    requested_digital_currency: executionOrder.crypto_currency,
  }
}

function payments (userId) {
  return PaymentRequest.findAll({
    where: {
      user_id: userId,
      payment_status: {
        [Op.ne]: 'notsubmitted'
      }
    },
    order: [
      ['createdAt', 'DESC']
    ]
  }).then(function (data) {
    return data.map(function (request) {
      return serializePayment(request.dataValues)
    })
  })
}
function sells (userId) {
  return SellRequest.findAll({
    where: { user_id: userId },
    order: [
      ['createdAt', 'DESC']
    ]
  }).then(function (data) {
    return data.map(function (request) {
      return serializeSell(request.dataValues)
    })
  })
}

function requestCreate (userId, payment) {
  return PaymentRequest.findOrCreate({
    where: {
      payment_id: payment.payment_id,
      user_id: userId
    },
    defaults: {
      quote_id: payment.quote_id,
      order_id: payment.order_id,
      fiat_total_amount: payment.fiat_total_amount.amount,
      fiat_currency: payment.fiat_total_amount.currency,
      requested_digital_amount: payment.requested_digital_amount.amount,
      requested_digital_currency: payment.requested_digital_amount.currency
    }
  })
}
function executionOrder (params) {
  return ExecutionOrder.findOne({where: params}).then(function (data) {
    return serializeExecutionOrder(data.dataValues)
  })
}

function executionOrders (params, options = {}) {
  if (options.onlyPending) {
    params.sent_at = null
    params.cancelled_at = null
    params.failed_at = null
  }
  return ExecutionOrder.findAll({
    where: params,
    order: [['createdAt', 'DESC']]
  }).then(function (data) {
    return data.map(function (request) {
      return serializeExecutionOrder(request.dataValues)
    })
  })
}

async function sellRequest (params) {
  const request = await SellRequest.findOne({where: params})
  return serializeSell(request)
}

function updateExecutionOrder (executionOrderId, status, cryptoAmountSent, txnHash) {
  const now = new Date()
  let sendAt = null
  let cancelledAt = null
  let failedAt = null
  if (status === 'completed') {
    sendAt = now
  } else if (status === 'failed') {
    failedAt = now
  } else if (status === 'cancelled') {
    cancelledAt = now
  }
  return ExecutionOrder.update(
    {
      crypto_amount_sent: cryptoAmountSent,
      blockchain_txn_hash: txnHash,
      sent_at: sendAt,
      cancelled_at: cancelledAt,
      failed_at: failedAt
    }, {
      where: {
        id: executionOrderId
      }
    })
}
function updateSellRequest (id, params) {
  return SellRequest.update(params, {where: {id}})
}

async function createExecutionOrder (data) {
  const executionOrder = await ExecutionOrder.create({
    id: uuid(),
    sell_id: data.sell_id,
    reason: data.reason,
    simplex_user_id: data.user_id,
    quote_id: data.quote_id,
    user_id: data.account_id,
    crypto_currency: data.crypto_currency,
    crypto_amount: data.crypto_amount,
    destination_crypto_address: data.destination_crypto_address
  })
  return serializeExecutionOrder(executionOrder)
}

function createSellRequest (request) {
  return SellRequest.create({
    id: uuid(),
    txn_id: request.txn_id,
    txn_url: request.txn_url,
    crypto_amount: request.crypto_amount,
    crypto_currency: request.crypto_currency,
    fiat_amount: request.fiat_amount,
    fiat_currency: request.fiat_currency,
    quote_id: request.quote_id,
    user_id: request.userId,
    send_request_at: null,
    sent_at: null,
    status: 'submitted'
  })
}

async function createSellEvent (sellId, status) {
  await SellEvent.create({
    id: uuid(),
    sell_id: sellId,
    sell_status: status
  })
  await updateSellRequest(sellId, {status})
}

async function paymentEvents (userId, paymentId) {
  const request = await PaymentRequest.findOne({
    where: {
      user_id: userId,
      payment_id: paymentId
    }
  })
  const payment = serializePayment(request)
  return PaymentEvent.findAll({
    where: {
      user_id: userId,
      payment_id: paymentId
    }
  }).then(function (data) {
    payment.events = data.map(function (event) {
      const data = event.dataValues
      return {
        id: data.id,
        name: data.name,
        payment_id: data.payment_id,
        status: data.payment_status,
        created_at: data.payment_created_at,
        updated_at: data.payment_updated_at
      }
    })
    return payment
  })
}

async function sellEvents (userId, sellId) {
  const request = await SellRequest.findOne({
    where: {
      user_id: userId,
      id: sellId
    }
  })
  const sell = serializeSell(request)
  return SellEvent.findAll({
    where: {
      sell_id: sellId
    }
  }).then(function (data) {
    sell.events = data.map(function (event) {
      return {
        id: event.id,
        name: event.name,
        sell_id: event.sell_id,
        status: event.sell_status,
        created_at: event.createdAt
      }
    })
    return sell
  })
}

async function eventCreate (event) {
  const request = await PaymentRequest.findById(event.payment.id)
  if (!request) {
    await requestCreate(event.payment.partner_end_user_id, {
      payment_id: event.payment.id,
      fiat_total_amount: {
        amount: event.payment.fiat_total_amount.amount,
        currency: event.payment.fiat_total_amount.currency
      },
      requested_digital_amount: {
        amount: null,
        currency: null
      }
    })
  }
  const newEvent = await PaymentEvent.findOrCreate({
    where: {
      id: event.event_id
    },
    defaults: {
      name: event.name,
      payment_status: event.payment.status,
      payment_created_at: new Date(event.payment.created_at),
      payment_updated_at: new Date(event.payment.updated_at),
      fiat_total_amount: event.payment.fiat_total_amount.amount,
      fiat_currency: event.payment.fiat_total_amount.currency,
      user_id: event.payment.partner_end_user_id,
      payment_id: event.payment.id
    }
  })
  if (request) {
    request.payment_status = event.payment.status
    await request.save()
  }
  return newEvent
}

module.exports = {
  paymentEvents,
  sellEvents,
  eventCreate,
  payments,
  sells,
  requestCreate,
  migrate,
  createExecutionOrder,
  createSellEvent,
  createSellRequest,
  executionOrder,
  executionOrders,
  sellRequest,
  updateExecutionOrder
}
