const Stripe = require('stripe');
const { SquareClient, SquareEnvironment } = require('square');
const { createHttpError, sendJson } = require('../webhooks/_lib/webhook-utils');
const { getPaymentStatus, setPaymentStatus } = require('./_lib/payment-state');

function getSquareEnvironment() {
  return String(process.env.SQUARE_ENVIRONMENT || '').toLowerCase() === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

function mapStripeStatus(status) {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'canceled':
    case 'requires_payment_method':
      return 'failed';
    default:
      return 'pending';
  }
}

function mapSquareStatus(status) {
  switch (status) {
    case 'COMPLETED':
      return 'succeeded';
    case 'FAILED':
    case 'CANCELED':
      return 'failed';
    default:
      return 'pending';
  }
}

async function fetchProviderStatus(provider, paymentId) {
  if (provider === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.retrieve(paymentId);
    return {
      status: mapStripeStatus(intent.status),
      amountCents: intent.amount || null,
      providerStatus: intent.status
    };
  }

  if (provider === 'square') {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return null;
    }
    const client = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment: getSquareEnvironment()
    });
    const response = await client.payments.get({
      paymentId
    });
    const payment = response.payment || response.result?.payment;
    if (!payment) {
      return null;
    }
    return {
      status: mapSquareStatus(payment.status),
      amountCents: payment.amountMoney ? payment.amountMoney.amount : null,
      providerStatus: payment.status
    };
  }

  throw createHttpError(400, 'Invalid payment provider.');
}

async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      throw createHttpError(405, 'Method not allowed.');
    }

    const provider = String(req.query.provider || '').toLowerCase();
    const paymentId = String(req.query.paymentId || '').trim();
    if (!provider || !paymentId) {
      throw createHttpError(400, 'Missing provider or paymentId query parameters.');
    }

    let payment = getPaymentStatus(provider, paymentId);

    const fallback = await fetchProviderStatus(provider, paymentId).catch(() => null);
    if (fallback) {
      payment = setPaymentStatus({
        provider,
        paymentId,
        status: fallback.status,
        amountCents: fallback.amountCents,
        eventType: fallback.providerStatus,
        metadata: {}
      });
    }

    if (!payment) {
      throw createHttpError(404, 'Payment status not found.');
    }

    sendJson(res, 200, {
      provider: payment.provider,
      paymentId: payment.paymentId,
      status: payment.status,
      amountCents: payment.amountCents,
      confirmed: payment.status === 'succeeded',
      updatedAt: payment.updatedAt
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || 'Failed to fetch payment status.'
    });
  }
}

module.exports = handler;
