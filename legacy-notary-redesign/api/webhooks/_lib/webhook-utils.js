const crypto = require('crypto');
const Stripe = require('stripe');

const MAX_BODY_SIZE_BYTES = 1024 * 1024;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getMissingEnvVarError(names, env) {
  const missing = names.filter((name) => !env[name]);
  if (!missing.length) {
    return null;
  }

  return createHttpError(
    500,
    `Missing required environment variables: ${missing.join(', ')}`
  );
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) {
        return;
      }

      size += chunk.length;

      if (size > MAX_BODY_SIZE_BYTES) {
        settled = true;
        reject(createHttpError(413, 'Request body too large.'));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function verifyStripeEvent({
  rawBody,
  signatureHeader,
  stripeSecretKey,
  webhookSecret
}) {
  const missingEnvVarError = getMissingEnvVarError(
    ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    {
      STRIPE_SECRET_KEY: stripeSecretKey,
      STRIPE_WEBHOOK_SECRET: webhookSecret
    }
  );

  if (missingEnvVarError) {
    throw missingEnvVarError;
  }

  if (!signatureHeader) {
    throw createHttpError(400, 'Missing stripe-signature header.');
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch (error) {
    throw createHttpError(400, `Invalid Stripe webhook signature: ${error.message}`);
  }
}

function safeCompare(a, b) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function verifySquareSignature({
  signatureHeader,
  signatureKey,
  notificationUrl,
  rawBody
}) {
  const missingEnvVarError = getMissingEnvVarError(
    ['SQUARE_WEBHOOK_SIGNATURE_KEY', 'SQUARE_WEBHOOK_NOTIFICATION_URL'],
    {
      SQUARE_WEBHOOK_SIGNATURE_KEY: signatureKey,
      SQUARE_WEBHOOK_NOTIFICATION_URL: notificationUrl
    }
  );

  if (missingEnvVarError) {
    throw missingEnvVarError;
  }

  if (!signatureHeader) {
    throw createHttpError(400, 'Missing x-square-hmacsha256-signature header.');
  }

  const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  const payload = `${notificationUrl}${bodyText}`;
  const expectedSignature = crypto
    .createHmac('sha256', signatureKey)
    .update(payload, 'utf8')
    .digest('base64');

  return safeCompare(expectedSignature, signatureHeader);
}

module.exports = {
  createHttpError,
  readRawBody,
  sendJson,
  verifySquareSignature,
  verifyStripeEvent
};
