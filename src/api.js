const rp = require('request-promise');

module.exports = function (sandbox, partnerId, apiKey) {
  if (!partnerId) {
    throw new Error("Missing partnerId.")
  }
  if (!apiKey) {
    throw new Error("Missing apiKey.")
  }

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
      wallet_id: partnerId,
    }
    const options = {
      method: 'POST',
      uri: API_BASE + '/wallet/merchant/v2/quote',
      headers: {
        Authorization: `ApiKey ${apiKey}`
      },
      body: data,
      json: true
    }
    return rp(options)
  }

  function getPartnerData(data, client_ip) {
    const newData = data
    newData['account_details']['signup_login']['ip'] = client_ip
    const options = {
      method: 'POST',
      uri: API_BASE + '/wallet/merchant/v2/payments/partner/data',
      headers: {
        Authorization: `ApiKey ${apiKey}`
      },
      body: newData,
      json: true
    }
    console.log(options)
    return rp(options)
  }
  return {
    getQuote, getPartnerData
  }
}
