require('dotenv').config()

const models = require('./models')
const api = require('./api')(
  process.env.SIMPLEX_SANDBOX === 'true',
  process.env.SIMPLEX_PARTNER_ID,
  process.env.SIMPLEX_API_KEY)

api.getEvents()
  .then(async function(data) {
    if (!data || !data.events) {
      return
    }
    const events = data.events;
    console.log(events)
    for (var i = 0; i < events.length; ++i) {
      try {
        await models.eventCreate(events[i])
        try {
          await api.eventDelete(events[i].event_id)
        } catch (e) {
          console.log(`Unable to delete ${events[i].event_id}`)
        }
      } catch (e) {
        console.log(e)
      }
    }
    process.exit()
  })
