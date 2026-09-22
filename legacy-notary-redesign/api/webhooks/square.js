const {
  createHttpError,
  readRawBody,
  sendJson,
  verifySquareSignature
} = require('./_lib/webhook-utils');

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const isVerified = verifySquareSignature({
      rawBody,
      signatureHeader: req.headers['x-square-hmacsha256-signature'],
      signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
      notificationUrl: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL
    });

    if (!isVerified) {
      throw createHttpError(400, 'Invalid Square webhook signature.');
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    switch (event.type) {
      case 'payment.created':
        console.info('Square webhook received payment.created', {
          eventId: event.event_id || null
        });
        break;
      case 'payment.updated':
        console.info('Square webhook received payment.updated', {
          eventId: event.event_id || null
        });
        break;
      default:
        console.info('Square webhook received verified event', {
          eventId: event.event_id || null,
          type: event.type || 'unknown'
        });
    }

    sendJson(res, 200, {
      received: true,
      type: event.type || 'unknown'
    });
  } catch (error) {
    const statusCode = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
    const message = error.message || 'Webhook verification failed.';

    if (statusCode >= 500) {
      console.error('Square webhook configuration error', { message });
    } else {
      console.warn('Square webhook rejected', { message });
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
