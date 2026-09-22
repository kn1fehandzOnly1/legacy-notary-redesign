const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const Stripe = require('stripe');

const {
  verifySquareSignature,
  verifyStripeEvent
} = require('./webhook-utils');

test('verifySquareSignature returns true for a valid signature', () => {
  const notificationUrl = 'https://example.com/api/webhooks/square';
  const rawBody = JSON.stringify({
    type: 'payment.created',
    event_id: 'evt_square_123'
  });
  const signatureKey = 'square_signature_key';
  const signatureHeader = crypto
    .createHmac('sha256', signatureKey)
    .update(`${notificationUrl}${rawBody}`, 'utf8')
    .digest('base64');

  assert.equal(
    verifySquareSignature({
      signatureHeader,
      signatureKey,
      notificationUrl,
      rawBody
    }),
    true
  );
});

test('verifySquareSignature returns false for an invalid signature', () => {
  assert.equal(
    verifySquareSignature({
      signatureHeader: 'invalid-signature',
      signatureKey: 'square_signature_key',
      notificationUrl: 'https://example.com/api/webhooks/square',
      rawBody: '{}'
    }),
    false
  );
});

test('verifyStripeEvent verifies a signed Stripe payload', () => {
  const payload = JSON.stringify({
    id: 'evt_test_webhook',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123'
      }
    }
  });
  const stripe = new Stripe('sk_test_123');
  const webhookSecret = 'whsec_test_secret';
  const signatureHeader = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret
  });

  const event = verifyStripeEvent({
    rawBody: Buffer.from(payload, 'utf8'),
    signatureHeader,
    stripeSecretKey: 'sk_test_123',
    webhookSecret
  });

  assert.equal(event.type, 'payment_intent.succeeded');
  assert.equal(event.data.object.id, 'pi_test_123');
});
