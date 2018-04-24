const rp = require('request-promise');

module.exports = function (sandbox) {
  const API_BASE = sandbox
    ? 'https://sandbox.test-simplexcc.com'
    : 'https://backend-wallet-api.simplexcc.com';

  function getQuote(
    digital_currency, fiat_currency, requested_currency,
    requested_amount, end_user_id, client_ip
  ) {
    const data = {
      digital_currency,
      fiat_currency,
      requested_currency,
      requested_amount,
      end_user_id,
      client_ip,
      wallet_id: process.env.SIMPLEX_PARTNER_ID,
    }
    const options = {
      method: 'POST',
      uri: API_BASE + '/wallet/merchant/v2/quote',
      headers: {
        Authorization: `ApiKey ${process.env.SIMPLEX_API_KEY}`
      },
      body: data,
      json: true
    }
    return rp(options)
  }
  return {
    getQuote
  }
}
