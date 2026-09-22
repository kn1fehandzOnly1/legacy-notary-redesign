const Stripe = require('stripe');
const {
  createHttpError,
  readRawBody,
  sendJson
} = require('../../webhooks/_lib/webhook-utils');
const { calculateQuote, assertAmountMatches } = require('../_lib/pricing');
const { setPaymentStatus } = require('../_lib/payment-state');

function parseBody(rawBody) {
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch (_error) {
    throw createHttpError(400, 'Invalid JSON payload.');
  }
}

function assertPost(req) {
  if (req.method !== 'POST') {
    throw createHttpError(405, 'Method not allowed.');
  }
}

function getIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (key.length < 8 || key.length > 128) {
    throw createHttpError(400, 'Invalid idempotency key.');
  }
  return key;
}

async function handler(req, res) {
  try {
    assertPost(req);

    if (!process.env.STRIPE_SECRET_KEY) {
      throw createHttpError(500, 'Missing required environment variable: STRIPE_SECRET_KEY');
    }

    const rawBody = await readRawBody(req);
    const body = parseBody(rawBody);

    const quote = calculateQuote({
      service: body.service,
      stamps: body.stamps,
      locationZone: body.locationZone
    });
    assertAmountMatches({ clientAmountCents: body.clientAmountCents, quote });

    const idempotencyKey = getIdempotencyKey(body.idempotencyKey);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: quote.totalCents,
        currency: 'usd',
        payment_method_types: ['card'],
        receipt_email: body.email || undefined,
        description: `Legacy Notary booking - ${quote.service}`,
        metadata: {
          provider: 'stripe',
          service: quote.service,
          stamps: String(quote.stamps),
          locationZone: quote.locationZone,
          appointmentDate: String(body.date || ''),
          appointmentTime: String(body.time || ''),
          customerEmail: String(body.email || '')
        }
      },
      {
        idempotencyKey
      }
    );

    setPaymentStatus({
      provider: 'stripe',
      paymentId: paymentIntent.id,
      status: 'pending',
      amountCents: quote.totalCents,
      metadata: {
        idempotencyKey
      }
    });

    sendJson(res, 200, {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amountCents: quote.totalCents,
      status: paymentIntent.status
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: error.message || 'Failed to create Stripe payment intent.'
    });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
