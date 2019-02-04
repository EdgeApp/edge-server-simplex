'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.createTable('payment_requests', {
        payment_id: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true,
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
      }),
      await queryInterface.createTable('events', {
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
            model: 'payment_requests',
            key: 'payment_id',
          },
          type: Sequelize.STRING,
          allowNull: true,
        }
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.dropTable('events'),
      await queryInterface.dropTable('payment_requests')
    ]
  }
};
