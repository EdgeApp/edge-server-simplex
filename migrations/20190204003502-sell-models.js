'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.createTable('sell_requests', {
        id: {
          primaryKey: true,
          type: Sequelize.STRING,
        },
        txn_id: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        txn_url: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        quote_id: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        account_id: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }),
      await queryInterface.createTable('send_cryptos', {
        id: {
          primaryKey: true,
          type: Sequelize.STRING,
        },
        reason:{
          type: Sequelize.STRING,
          allowNull: true,
        },
        txn_id: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        account_id: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        quote_id: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        crypto_currency: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        crypto_amount: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        destination_crypto_address: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
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
        /*
        sell_id: {
          references: {
            model: 'sell_request',
            key: 'id',
          },
          type: Sequelize.INTEGER,
          allowNull: true,
        }
        */
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.dropTable('send_cryptos'),
      await queryInterface.dropTable('sell_requests')
    ]
  }
};
