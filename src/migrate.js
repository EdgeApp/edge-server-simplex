require('dotenv').config()

const models = require('./models')

models.migrate()
  .then(function() {
    process.exit()
  })
