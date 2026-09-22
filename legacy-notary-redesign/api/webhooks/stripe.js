const {
  readRawBody,
  sendJson,
  verifyStripeEvent
} = require('./_lib/webhook-utils');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const event = verifyStripeEvent({
      rawBody,
      signatureHeader: req.headers['stripe-signature'],
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    });

    switch (event.type) {
      case 'checkout.session.completed':
        console.info('Stripe webhook received checkout.session.completed', {
          id: event.id
        });
        break;
      case 'payment_intent.succeeded':
        console.info('Stripe webhook received payment_intent.succeeded', {
          id: event.id
        });
        break;
      case 'payment_intent.payment_failed':
        console.warn('Stripe webhook received payment_intent.payment_failed', {
          id: event.id
        });
        break;
      default:
        console.info('Stripe webhook received verified event', {
          id: event.id,
          type: event.type
        });
    }

    sendJson(res, 200, {
      received: true,
      type: event.type
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode >= 500
        ? error.message || 'Server configuration error.'
        : error.message || 'Webhook verification failed.';

    if (statusCode >= 500) {
      console.error('Stripe webhook configuration error', { message });
    } else {
      console.warn('Stripe webhook rejected', { message });
    }

    sendJson(res, statusCode, { error: message });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
