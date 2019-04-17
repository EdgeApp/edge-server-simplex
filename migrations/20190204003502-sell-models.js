'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.createTable('sell_requests', {
        id: {
          primaryKey: true,
          type: Sequelize.UUID
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
      }),
      await queryInterface.createTable('sell_events', {
        id: {
          primaryKey: true,
          type: Sequelize.UUID
        },
        sell_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sell_status: {
          type: Sequelize.STRING,
          allowNull: false
        }
      }),
      await queryInterface.createTable('execution_order', {
        id: {
          primaryKey: true,
          type: Sequelize.UUID
        },
        reason: {
          type: Sequelize.STRING,
          allowNull: true
        },
        user_id: {
          type: Sequelize.STRING,
          allowNull: false
        },
        simplex_user_id: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        quote_id: {
          type: Sequelize.STRING,
          allowNull: true,
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
        sell_id: {
          references: {
            model: 'sell_requests',
            key: 'id'
          },
          type: Sequelize.UUID,
          allowNull: false
        }
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.dropTable('execution_order'),
      await queryInterface.dropTable('sell_requests'),
      await queryInterface.dropTable('sell_events')
    ]
  }
}
