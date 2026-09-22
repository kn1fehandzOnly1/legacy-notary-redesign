const { SquareClient, SquareEnvironment } = require('square');
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

function getSquareEnvironment() {
  return String(process.env.SQUARE_ENVIRONMENT || '').toLowerCase() === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

function getIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (key.length < 8 || key.length > 128) {
    throw createHttpError(400, 'Invalid idempotency key.');
  }
  return key;
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

async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      throw createHttpError(405, 'Method not allowed.');
    }

    if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
      throw createHttpError(
        500,
        'Missing required environment variables: SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID'
      );
    }

    const rawBody = await readRawBody(req);
    const body = parseBody(rawBody);

    const sourceId = String(body.sourceId || '').trim();
    if (!sourceId) {
      throw createHttpError(400, 'Missing Square source token.');
    }

    const quote = calculateQuote({
      service: body.service,
      stamps: body.stamps,
      locationZone: body.locationZone
    });
    assertAmountMatches({ clientAmountCents: body.clientAmountCents, quote });

    const idempotencyKey = getIdempotencyKey(body.idempotencyKey);

    const client = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN,
      environment: getSquareEnvironment()
    });

    const response = await client.payments.create({
      sourceId,
      idempotencyKey,
      locationId: process.env.SQUARE_LOCATION_ID,
      amountMoney: {
        amount: quote.totalCents,
        currency: 'USD'
      },
      autocomplete: true,
      buyerEmailAddress: body.email || undefined,
      note: `Legacy Notary booking - ${quote.service}`
    });

    const payment = response.payment || response.result?.payment;
    if (!payment || !payment.id) {
      throw createHttpError(502, 'Square payment creation did not return a payment ID.');
    }

    const normalizedStatus = mapSquareStatus(payment.status);
    setPaymentStatus({
      provider: 'square',
      paymentId: payment.id,
      status: normalizedStatus,
      amountCents: quote.totalCents,
      metadata: {
        idempotencyKey
      }
    });

    sendJson(res, 200, {
      paymentId: payment.id,
      status: normalizedStatus,
      amountCents: quote.totalCents
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const message =
      error.message || (error.errors && error.errors[0] && error.errors[0].detail) || 'Square payment failed.';
    sendJson(res, statusCode, {
      error: message
    });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
