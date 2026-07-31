document.addEventListener('DOMContentLoaded', () => {

  // --- Elements ---
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

  let activeProvider = 'stripe';

  // --- Dynamic Calculation ---
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

  // --- Payment Provider Tabs Switcher (Stripe vs Square) ---
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
    });
  });

  // --- Form Submission & Live Receipt Simulation ---
  const checkoutForm = document.getElementById('checkout-form');
  const receiptModal = document.getElementById('receipt-modal');

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const payBtn = document.getElementById('pay-submit-btn');
      const originalText = payBtn.innerHTML;

      // Show processing spinner state
      payBtn.disabled = true;
      payBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing ${activeProvider.toUpperCase()} Authorization...`;

      setTimeout(() => {
        payBtn.disabled = false;
        payBtn.innerHTML = originalText;

        // Populate receipt modal
        const confId = 'LNS-' + Math.floor(100000 + Math.random() * 900000);
        const name = document.getElementById('checkout-name').value;
        const address = document.getElementById('checkout-address').value;
        const date = document.getElementById('checkout-date').value;
        const time = document.getElementById('checkout-time').value;
        const total = summaryTotalPrice ? summaryTotalPrice.textContent : '170.00';

        document.getElementById('receipt-conf-id').textContent = confId;
        document.getElementById('receipt-service').textContent = summaryServiceTitle.textContent;
        document.getElementById('receipt-datetime').textContent = `${date || 'Scheduled Date'} (${time})`;
        document.getElementById('receipt-location').textContent = address || 'Requested Location';
        document.getElementById('receipt-provider').textContent = activeProvider === 'stripe' ? 'Stripe Credit Card' : 'Square Web Payments';
        document.getElementById('receipt-total').textContent = `$${total}`;

        if (receiptModal) receiptModal.classList.add('active');
      }, 1500);
    });
  }

});
