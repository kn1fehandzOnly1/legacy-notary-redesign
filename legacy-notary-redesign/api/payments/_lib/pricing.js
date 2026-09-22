const { createHttpError } = require('../../webhooks/_lib/webhook-utils');

const SERVICE_PRICES = Object.freeze({
  general: 25,
  poa: 45,
  refinance: 125,
  'full-loan': 150,
  hospital: 65,
  ron: 35
});

const TRAVEL_FEES = Object.freeze({
  'kc-mo': 20,
  'overland-park': 20,
  olathe: 25,
  outskirts: 40
});

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCents(value) {
  return Math.round(value * 100);
}

function calculateQuote({ service, stamps, locationZone }) {
  if (!SERVICE_PRICES[service]) {
    throw createHttpError(400, 'Invalid service selection.');
  }

  if (!TRAVEL_FEES[locationZone]) {
    throw createHttpError(400, 'Invalid travel zone selection.');
  }

  const stampCount = parseInteger(stamps, 1);
  if (stampCount < 1 || stampCount > 15) {
    throw createHttpError(400, 'Invalid stamp count.');
  }

  const basePrice = SERVICE_PRICES[service];
  const travelFee = service === 'ron' ? 0 : TRAVEL_FEES[locationZone];
  const extraStamps = Math.max(0, stampCount - 1);
  const extraStampsFee = extraStamps * 6;
  const total = basePrice + travelFee + extraStampsFee;

  return {
    service,
    stamps: stampCount,
    locationZone,
    basePrice,
    travelFee,
    extraStamps,
    extraStampsFee,
    total,
    totalCents: toCents(total)
  };
}

function assertAmountMatches({ clientAmountCents, quote }) {
  const expected = quote.totalCents;
  const provided = parseInteger(clientAmountCents, -1);

  if (provided !== expected) {
    throw createHttpError(
      400,
      `Amount mismatch. Expected ${expected} cents and received ${provided} cents.`
    );
  }
}

module.exports = {
  calculateQuote,
  assertAmountMatches
};
