const {
  readRawBody,
  sendJson,
  verifyStripeEvent
} = require('./_lib/webhook-utils');
const { setPaymentStatus } = require('../payments/_lib/payment-state');

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
        if (event.data && event.data.object && event.data.object.payment_intent) {
          setPaymentStatus({
            provider: 'stripe',
            paymentId: event.data.object.payment_intent,
            status: 'succeeded',
            eventType: event.type
          });
        }
        console.info('Stripe webhook received checkout.session.completed', {
          id: event.id
        });
        break;
      case 'payment_intent.succeeded':
        setPaymentStatus({
          provider: 'stripe',
          paymentId: event.data.object.id,
          status: 'succeeded',
          amountCents: event.data.object.amount || null,
          eventType: event.type
        });
        console.info('Stripe webhook received payment_intent.succeeded', {
          id: event.id
        });
        break;
      case 'payment_intent.payment_failed':
        setPaymentStatus({
          provider: 'stripe',
          paymentId: event.data.object.id,
          status: 'failed',
          amountCents: event.data.object.amount || null,
          eventType: event.type
        });
        console.warn('Stripe webhook received payment_intent.payment_failed', {
          id: event.id
        });
        break;
      case 'payment_intent.canceled':
        setPaymentStatus({
          provider: 'stripe',
          paymentId: event.data.object.id,
          status: 'failed',
          amountCents: event.data.object.amount || null,
          eventType: event.type
        });
        console.warn('Stripe webhook received payment_intent.canceled', {
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
