const Sequelize = require('sequelize')
const Op = Sequelize.Op
const uuid = require('uuid/v4')

const env = process.env.NODE_ENV || 'development'
const config = require(__dirname + '/../config/config')[env]

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'postgres',
    pool: { max: 5, min: 0, idle: 10000 },
    omitNull: true,
  })


const PaymentRequest = sequelize.define('payment_requests', {
  payment_id: {
    primaryKey: true,
    type: Sequelize.STRING,
    allowNull: false,
  },
  quote_id: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  order_id: {
    type: Sequelize.STRING,
    allowNull: true,
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

const Event = sequelize.define('events', {
  id: {
    primaryKey: true,
    type: Sequelize.STRING,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  payment_status: {
    type: Sequelize.STRING,
    allowNull: true,
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
      key: 'payment_id',
    },
    type: Sequelize.STRING,
    allowNull: true,
  }
}, { timestamps: false })

const SellRequest = sequelize.define('sell_requests', {
  id: {
    type: Sequelize.STRING,
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
  quote_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  account_id: {
    type: Sequelize.STRING,
    allowNull: false
  }
})

const SendCrypto = sequelize.define('send_cryptos', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false
  },
  reason: {
    type: Sequelize.STRING,
    allowNull: true
  },
  txn_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  user_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  account_id: {
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
    type: Sequelize.INTEGER,
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
  canceled_at: {
    type: Sequelize.DATE,
    allowNull: true
  }
})
async function migrate () {
  await PaymentRequest.sync({force: true})
  await Event.sync({force: true})
  await SellRequest.sync({force: true})
  await SendCrypto.sync({force: true})
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
    requested_digital_currency: data.requested_digital_currency,
  }
}

function payments (userId) {
  return PaymentRequest.findAll({
    where: { user_id: userId, payment_status: {
        [Op.ne]: "notsubmitted"
      },
    },
    order: [
      ['createdAt', 'DESC']
    ]
  }).then(function(data) {
    return data.map(function (request) {
      return serializePayment(request.dataValues);
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
      requested_digital_currency: payment.requested_digital_amount.currency,
    }
  })
}
function sendCryptoRequest (params) {
  return SendCrypto.findAll({where: params, order: [['sent_at', 'DESC']]})
}
function getSellByTxnId (txnId) {
  return SellRequest.find({where: {
    txn_id: txnId
  }})
}

function updateSendCrypto (sendCryptoId, status, cryptoAmountSent, txnHash) {
  let sendAt = null
  let canceledAt = null
  if (status === 'completed') {
    sendAt = new Date()
  } else {
    canceledAt = new Date()
  }
  return SendCrypto.update(
    {
      crypto_amount_sent: cryptoAmountSent,
      blockchain_txn_hash: txnHash,
      sent_at: sendAt,
      canceled_at: canceledAt
    }, {
      where: {
        id: sendCryptoId
      }
    })
}

async function createSendCryptoRequest (request) {
  const sellRequest = await getSellByTxnId(request.txn_id)
  return SendCrypto.create({
    id: uuid(),
    sell_id: sellRequest.id,
    reason: request.reason,
    txn_id: request.txn_id,
    user_id: request.user_id,
    quote_id: request.quote_id,
    account_id: request.account_id,
    crypto_currency: request.crypto_currency,
    crypto_amount: request.crypto_amount,
    destination_crypto_address: request.destination_crypto_address
  })
}

function createSellRequest (request) {
  return SellRequest.create({
    id: uuid(),
    txn_id: request.txn_id,
    txn_url: request.txn_url,
    quote_id: request.quoteId,
    account_id: request.accountId,
    send_request_at: null,
    sent_at: null,
    refund_at: null
  })
}

async function events (userId, paymentId) {
  let request = await PaymentRequest.findOne({
    where: {
      user_id: userId,
      payment_id: paymentId
    }
  })
  let payment = serializePayment(request)
  return Event.findAll({
    where: {
      user_id: userId,
      payment_id: paymentId
    }
  }).then(function(data) {
    payment.events = data.map(function(event) {
      var data = event.dataValues
      return {
        id: data.id,
        name: data.name,
        payment_id: data.payment_id,
        payment_status: data.payment_status,
        created_at: data.payment_created_at,
        updated_at: data.payment_updated_at
      }
    })
    return payment
  })
}

async function eventCreate (event) {
  let request = await PaymentRequest.findById(event.payment.id)
  if (!request) {
    requestCreate(event.payment.partner_end_user_id, {
      payment_id: event.payment.id,
      fiat_total_amount: {
        amount: event.payment.fiat_total_amount.amount,
        currency: event.payment.fiat_total_amount.currency,
      },
      requested_digital_amount: {
        amount: null,
        currency: null
      }
    })
  }
  let newEvent = await Event.findOrCreate({
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
  events,
  eventCreate,
  payments,
  requestCreate,
  migrate,
  createSendCryptoRequest,
  createSellRequest,
  sendCryptoRequest,
  updateSendCrypto
}
