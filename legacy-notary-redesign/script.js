document.addEventListener('DOMContentLoaded', () => {
  
  // --- Mobile Navigation ---
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeMobileBtn = document.getElementById('close-mobile-btn');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  function openMobileNav() {
    mobileNavOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNavOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMobileNav);
  if (closeMobileBtn) closeMobileBtn.addEventListener('click', closeMobileNav);
  
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // --- Booking Modal ---
  const bookingModal = document.getElementById('booking-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const openBookingBtns = document.querySelectorAll('.open-booking-btn');
  const bookServiceSelect = document.getElementById('book-service');

  function openModal(serviceName = null) {
    if (serviceName && bookServiceSelect) {
      for (let option of bookServiceSelect.options) {
        if (option.value.toLowerCase().includes(serviceName.toLowerCase()) || 
            option.text.toLowerCase().includes(serviceName.toLowerCase())) {
          option.selected = true;
          break;
        }
      }
    }
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    bookingModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  openBookingBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetService = btn.getAttribute('data-service');
      openModal(targetService);
    });
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) closeModal();
    });
  }

  // --- Booking Form Handler ---
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('book-name').value;
      closeModal();
      showToast(`Thank you, ${name}! Your booking request has been submitted. We will call you shortly at (816) 400-9871 to confirm details.`);
      bookingForm.reset();
    });
  }

  // --- Interactive Fee Estimator ---
  const calcService = document.getElementById('calc-service');
  const calcLocation = document.getElementById('calc-location');
  const calcStamps = document.getElementById('calc-stamps');
  const estimatedPriceSpan = document.getElementById('estimated-price');

  const basePrices = {
    general: 25,
    poa: 45,
    refinance: 125,
    'full-loan': 150,
    ron: 35
  };

  const travelFees = {
    'kc-mo': 20,
    'overland-park': 20,
    'olathe': 25,
    'lees-summit': 25,
    'independence': 20,
    'outskirts': 40
  };

  function updateEstimate() {
    if (!calcService || !calcLocation || !calcStamps || !estimatedPriceSpan) return;
    
    const serviceVal = calcService.value;
    const locationVal = calcLocation.value;
    const stampsVal = parseInt(calcStamps.value) || 1;

    const base = basePrices[serviceVal] || 35;
    const travel = serviceVal === 'ron' ? 0 : (travelFees[locationVal] || 25);
    const extraStampsFee = Math.max(0, stampsVal - 1) * 6;

    const total = base + travel + extraStampsFee;
    estimatedPriceSpan.textContent = total;
  }

  if (calcService) calcService.addEventListener('change', updateEstimate);
  if (calcLocation) calcLocation.addEventListener('change', updateEstimate);
  if (calcStamps) calcStamps.addEventListener('input', updateEstimate);

  const calcBookBtn = document.getElementById('calc-book-btn');
  if (calcBookBtn) {
    calcBookBtn.addEventListener('click', () => {
      const selectedText = calcService.options[calcService.selectedIndex].text;
      openModal(selectedText);
    });
  }

  // Initial estimate calculation
  updateEstimate();

  // --- Reviews Filter ---
  const filterBtns = document.querySelectorAll('.filter-btn');
  const reviewCards = document.querySelectorAll('.review-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      reviewCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --- FAQ Accordion ---
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // --- Toast Notification Function ---
  function showToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10B981; font-size: 1.2rem;"></i> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

});
