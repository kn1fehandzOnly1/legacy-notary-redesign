const { sendJson } = require('../webhooks/_lib/webhook-utils');

function handler(_req, res) {
  sendJson(res, 200, {
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    squareApplicationId: process.env.SQUARE_APPLICATION_ID || '',
    squareLocationId: process.env.SQUARE_LOCATION_ID || '',
    squareEnvironment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
  });
}

module.exports = handler;
