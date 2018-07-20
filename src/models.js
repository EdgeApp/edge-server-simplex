const Sequelize = require('sequelize')
const Op = Sequelize.Op;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    pool: {max: 5, min: 0, idle: 10000},
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
    allowNull: false,
  },
  order_id: {
    type: Sequelize.STRING,
    allowNull: false,
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

async function migrate () {
  await PaymentRequest.sync({force: true})
  return Event.sync({force: true})
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
      fiat_total_amount: event.payment.fiat_total_amount.amount,
      fiat_currency: event.payment.fiat_total_amount.currency,
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

module.exports = { events, eventCreate, payments, requestCreate, migrate }
