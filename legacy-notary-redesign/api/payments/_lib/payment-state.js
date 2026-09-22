const PAYMENT_RECORD_TTL_MS = 24 * 60 * 60 * 1000;
const paymentState = new Map();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of paymentState.entries()) {
    if (now - value.updatedAt > PAYMENT_RECORD_TTL_MS) {
      paymentState.delete(key);
    }
  }
}

function makeKey(provider, paymentId) {
  return `${provider}:${paymentId}`;
}

function setPaymentStatus({
  provider,
  paymentId,
  status,
  amountCents = null,
  eventType = null,
  metadata = {}
}) {
  cleanupExpired();
  const key = makeKey(provider, paymentId);
  const current = paymentState.get(key) || {};
  const next = {
    provider,
    paymentId,
    status,
    amountCents,
    eventType,
    metadata: {
      ...current.metadata,
      ...metadata
    },
    createdAt: current.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  paymentState.set(key, next);
  return next;
}

function getPaymentStatus(provider, paymentId) {
  cleanupExpired();
  return paymentState.get(makeKey(provider, paymentId)) || null;
}

module.exports = {
  getPaymentStatus,
  setPaymentStatus
};
