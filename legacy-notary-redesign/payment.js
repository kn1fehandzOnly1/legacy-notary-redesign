document.addEventListener('DOMContentLoaded', () => {
  const serviceSelect = document.getElementById('checkout-service');
  const stampsInput = document.getElementById('checkout-stamps');
  const locationSelect = document.getElementById('checkout-location-zone');
  const summaryServiceTitle = document.getElementById('summary-service-title');
  const summaryBasePrice = document.getElementById('summary-base-price');
  const summaryTravelZone = document.getElementById('summary-travel-zone');
  const summaryTravelPrice = document.getElementById('summary-travel-price');
  const stampsExtraLine = document.getElementById('stamps-extra-line');
  const summaryStampsCount = document.getElementById('summary-stamps-count');
  const summaryStampsPrice = document.getElementById('summary-stamps-price');
  const summaryTotalPrice = document.getElementById('summary-total-price');
  const btnPayAmount = document.getElementById('btn-pay-amount');
  const paymentStatusMessage = document.getElementById('payment-status-message');
  const stripeCardError = document.getElementById('stripe-card-errors');
  const squareCardError = document.getElementById('square-card-errors');
  const receiptModal = document.getElementById('receipt-modal');

  let activeProvider = 'stripe';
  let stripeClient = null;
  let stripeElements = null;
  let stripeCardElement = null;
  let squarePayments = null;
  let squareCard = null;
  let paymentConfig = null;

  const PRICE_MAP = {
    general: 25,
    poa: 45,
    refinance: 125,
    'full-loan': 150,
    hospital: 65,
    ron: 35
  };
  const TRAVEL_MAP = {
    'kc-mo': 20,
    'overland-park': 20,
    olathe: 25,
    outskirts: 40
  };

  function formatError(error) {
    if (!error) return 'Payment failed.';
    if (typeof error === 'string') return error;
    return error.message || 'Payment failed.';
  }

  function setStatus(message, isError = false) {
    if (!paymentStatusMessage) return;
    paymentStatusMessage.textContent = message || '';
    paymentStatusMessage.classList.toggle('error', Boolean(isError));
  }

  function setCardError(provider, message) {
    const target = provider === 'stripe' ? stripeCardError : squareCardError;
    if (!target) return;
    target.textContent = message || '';
  }

  function setSubmitState(isLoading, message) {
    const payBtn = document.getElementById('pay-submit-btn');
    if (!payBtn) return;
    if (isLoading) {
      payBtn.disabled = true;
      payBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${message || 'Processing payment...'}`;
      return;
    }
    payBtn.disabled = false;
    payBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pay $<span id="btn-pay-amount">${summaryTotalPrice ? summaryTotalPrice.textContent : '0.00'}</span> & Confirm Booking`;
    const refreshedBtnAmount = document.getElementById('btn-pay-amount');
    if (refreshedBtnAmount && summaryTotalPrice) {
      refreshedBtnAmount.textContent = summaryTotalPrice.textContent;
    }
  }

  function createIdempotencyKey() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getBookingPayload() {
    const service = serviceSelect ? serviceSelect.value : 'full-loan';
    const stamps = stampsInput ? Number.parseInt(stampsInput.value, 10) || 1 : 1;
    const locationZone = locationSelect ? locationSelect.value : 'overland-park';
    const email = document.getElementById('checkout-email')?.value || '';
    const name = document.getElementById('checkout-name')?.value || '';
    const phone = document.getElementById('checkout-phone')?.value || '';
    const address = document.getElementById('checkout-address')?.value || '';
    const date = document.getElementById('checkout-date')?.value || '';
    const time = document.getElementById('checkout-time')?.value || '';
    const clientAmountCents = Number.parseFloat(summaryTotalPrice?.textContent || '0') * 100;
    return {
      service,
      stamps,
      locationZone,
      email,
      name,
      phone,
      address,
      date,
      time,
      clientAmountCents: Math.round(clientAmountCents)
    };
  }

  function calculateClientTotalCents(payload) {
    const base = PRICE_MAP[payload.service] || 0;
    const travel = payload.service === 'ron' ? 0 : TRAVEL_MAP[payload.locationZone] || 0;
    const extraStamps = Math.max(0, payload.stamps - 1) * 6;
    return Math.round((base + travel + extraStamps) * 100);
  }

  function updateOrderSummary() {
    if (!serviceSelect || !locationSelect || !stampsInput) return;

    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const basePrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
    const serviceText = selectedOption.text.split('-')[0].trim();

    const selectedTravelOption = locationSelect.options[locationSelect.selectedIndex];
    const travelFee = parseFloat(selectedTravelOption.getAttribute('data-travel')) || 0;
    const travelText = selectedTravelOption.text.split('-')[0].trim();

    const stampsCount = parseInt(stampsInput.value) || 1;
    const extraStamps = Math.max(0, stampsCount - 1);
    const extraStampsFee = extraStamps * 6.00;

    // Update Summary UI
    if (summaryServiceTitle) summaryServiceTitle.textContent = serviceText;
    if (summaryBasePrice) summaryBasePrice.textContent = `$${basePrice.toFixed(2)}`;
    
    if (summaryTravelZone) summaryTravelZone.textContent = travelText;
    if (summaryTravelPrice) summaryTravelPrice.textContent = `$${travelFee.toFixed(2)}`;

    if (extraStamps > 0) {
      if (stampsExtraLine) stampsExtraLine.style.display = 'flex';
      if (summaryStampsCount) summaryStampsCount.textContent = extraStamps;
      if (summaryStampsPrice) summaryStampsPrice.textContent = `$${extraStampsFee.toFixed(2)}`;
    } else {
      if (stampsExtraLine) stampsExtraLine.style.display = 'none';
    }

    const grandTotal = basePrice + travelFee + extraStampsFee;
    if (summaryTotalPrice) summaryTotalPrice.textContent = grandTotal.toFixed(2);
    if (btnPayAmount) btnPayAmount.textContent = grandTotal.toFixed(2);
  }

  if (serviceSelect) serviceSelect.addEventListener('change', updateOrderSummary);
  if (locationSelect) locationSelect.addEventListener('change', updateOrderSummary);
  if (stampsInput) stampsInput.addEventListener('input', updateOrderSummary);
  updateOrderSummary();

  const paymentTabs = document.querySelectorAll('.payment-tab');
  const stripeBox = document.getElementById('stripe-payment-container');
  const squareBox = document.getElementById('square-payment-container');

  paymentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      paymentTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      activeProvider = tab.getAttribute('data-provider');

      if (activeProvider === 'stripe') {
        if (stripeBox) stripeBox.classList.add('active');
        if (squareBox) squareBox.classList.remove('active');
      } else {
        if (squareBox) squareBox.classList.add('active');
        if (stripeBox) stripeBox.classList.remove('active');
      }
      setCardError('stripe', '');
      setCardError('square', '');
      setStatus('');
    });
  });

  async function initializeStripe() {
    if (!paymentConfig || !paymentConfig.stripePublishableKey || !window.Stripe) {
      return;
    }
    stripeClient = window.Stripe(paymentConfig.stripePublishableKey);
    stripeElements = stripeClient.elements();
    stripeCardElement = stripeElements.create('card');
    stripeCardElement.mount('#stripe-card-element');
    stripeCardElement.on('change', (event) => {
      setCardError('stripe', event.error ? event.error.message : '');
    });
  }

  async function initializeSquare() {
    if (
      !paymentConfig ||
      !paymentConfig.squareApplicationId ||
      !paymentConfig.squareLocationId ||
      !window.Square
    ) {
      return;
    }

    squarePayments = window.Square.payments(
      paymentConfig.squareApplicationId,
      paymentConfig.squareLocationId
    );
    squareCard = await squarePayments.card();
    await squareCard.attach('#square-card-container');
  }

  async function loadSquareSdk() {
    const env = String(paymentConfig?.squareEnvironment || '').toLowerCase();
    const sdkSrc =
      env === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';

    if (window.Square) return;

    await new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${sdkSrc}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load Square SDK.')), {
          once: true
        });
        return;
      }

      const script = document.createElement('script');
      script.src = sdkSrc;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Unable to load Square SDK.'));
      document.head.appendChild(script);
    });
  }

  async function loadPaymentConfig() {
    const response = await fetch('/api/payments/config');
    if (!response.ok) {
      throw new Error('Unable to load payment configuration.');
    }
    paymentConfig = await response.json();
    await initializeStripe();
    await loadSquareSdk();
    await initializeSquare();
  }

  function populateReceipt({ provider, paymentId }) {
    const address = document.getElementById('checkout-address').value;
    const date = document.getElementById('checkout-date').value;
    const time = document.getElementById('checkout-time').value;
    const total = summaryTotalPrice ? summaryTotalPrice.textContent : '170.00';
    document.getElementById('receipt-conf-id').textContent = (paymentId || '').slice(-12).toUpperCase();
    document.getElementById('receipt-service').textContent = summaryServiceTitle.textContent;
    document.getElementById('receipt-datetime').textContent = `${date || 'Scheduled Date'} (${time})`;
    document.getElementById('receipt-location').textContent = address || 'Requested Location';
    document.getElementById('receipt-provider').textContent =
      provider === 'stripe' ? 'Stripe Credit Card' : 'Square Web Payments';
    document.getElementById('receipt-total').textContent = `$${total}`;
  }

  async function pollForConfirmation(provider, paymentId) {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(
        `/api/payments/status?provider=${encodeURIComponent(provider)}&paymentId=${encodeURIComponent(paymentId)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'succeeded') {
          return data;
        }
        if (data.status === 'failed') {
          throw new Error('Payment was declined or canceled.');
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error('Timed out waiting for payment confirmation.');
  }

  async function processStripePayment(bookingPayload) {
    if (!stripeClient || !stripeCardElement) {
      throw new Error('Stripe is not configured. Add STRIPE_PUBLISHABLE_KEY to continue.');
    }

    const idempotencyKey = createIdempotencyKey();
    const intentResponse = await fetch('/api/payments/stripe/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...bookingPayload,
        idempotencyKey
      })
    });
    const intentData = await intentResponse.json();
    if (!intentResponse.ok) {
      throw new Error(intentData.error || 'Unable to create Stripe payment intent.');
    }

    const confirmResult = await stripeClient.confirmCardPayment(intentData.clientSecret, {
      payment_method: {
        card: stripeCardElement,
        billing_details: {
          name: bookingPayload.name,
          email: bookingPayload.email,
          phone: bookingPayload.phone,
          address: {
            line1: bookingPayload.address
          }
        }
      }
    });

    if (confirmResult.error) {
      throw new Error(confirmResult.error.message || 'Card confirmation failed.');
    }

    return pollForConfirmation('stripe', confirmResult.paymentIntent.id);
  }

  async function processSquarePayment(bookingPayload) {
    if (!squareCard) {
      throw new Error('Square is not configured. Add SQUARE_APPLICATION_ID and SQUARE_LOCATION_ID.');
    }

    const tokenResult = await squareCard.tokenize();
    if (tokenResult.status !== 'OK') {
      throw new Error('Unable to tokenize Square card details.');
    }

    const paymentResponse = await fetch('/api/payments/square/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...bookingPayload,
        sourceId: tokenResult.token,
        idempotencyKey: createIdempotencyKey()
      })
    });

    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) {
      throw new Error(paymentData.error || 'Unable to create Square payment.');
    }

    return pollForConfirmation('square', paymentData.paymentId);
  }

  loadPaymentConfig().catch((error) => {
    setStatus(formatError(error), true);
  });

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setCardError('stripe', '');
      setCardError('square', '');
      setStatus('');

      const bookingPayload = getBookingPayload();
      const recalculatedAmount = calculateClientTotalCents(bookingPayload);
      if (recalculatedAmount !== bookingPayload.clientAmountCents) {
        setStatus('Price changed. Please review your quote and submit again.', true);
        updateOrderSummary();
        return;
      }

      try {
        setSubmitState(true, `Processing ${activeProvider.toUpperCase()} payment...`);
        setStatus('Authorizing payment...');

        const result =
          activeProvider === 'stripe'
            ? await processStripePayment(bookingPayload)
            : await processSquarePayment(bookingPayload);

        setStatus('Payment confirmed. Finalizing booking...');
        populateReceipt({
          provider: activeProvider,
          paymentId: result.paymentId
        });
        if (receiptModal) {
          receiptModal.classList.add('active');
        }
        setStatus('');
      } catch (error) {
        const message = formatError(error);
        setStatus(message, true);
        setCardError(activeProvider, message);
      } finally {
        setSubmitState(false);
      }
    });
  }
});
