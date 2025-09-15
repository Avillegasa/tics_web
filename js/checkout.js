/*
  TICS Store - Checkout Page Functionality
  
  This module handles:
  - Multi-step checkout process
  - Form validation and submission
  - Payment method selection
  - Order summary display
  - Simulated payment processing
*/

// ================================================
// CHECKOUT STATE
// ================================================
let currentStep = 1;
let checkoutData = {
  shipping: {},
  payment: {},
  orderItems: []
};

// ================================================
// CHECKOUT INITIALIZATION
// ================================================

/**
 * Initialize checkout page
 */
function initCheckout() {
  console.log('Initializing checkout...');
  
  // Check if cart has items
  const cart = window.CartManager?.getCart() || [];
  if (cart.length === 0) {
    redirectToEmptyCart();
    return;
  }
  
  // Load order items
  checkoutData.orderItems = cart;
  
  // Initialize checkout steps
  initCheckoutSteps();
  
  // Initialize form handling
  initCheckoutForms();
  
  // Update order summary
  updateOrderSummary();
  
  console.log('Checkout initialized successfully!');
}

/**
 * Redirect to cart if empty
 */
function redirectToEmptyCart() {
  TICS.ToastManager.warning('Tu carrito está vacío');
  setTimeout(() => {
    window.location.href = 'cart.html';
  }, 2000);
}

// ================================================
// CHECKOUT STEPS MANAGEMENT
// ================================================

/**
 * Initialize checkout steps
 */
function initCheckoutSteps() {
  const stepButtons = document.querySelectorAll('.step');
  const continueBtn = document.getElementById('continue-to-payment');
  const backBtn = document.getElementById('back-to-shipping');
  const completeBtn = document.getElementById('complete-order');
  
  // Step navigation buttons
  if (continueBtn) {
    continueBtn.addEventListener('click', () => proceedToStep(2));
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', () => proceedToStep(1));
  }
  
  if (completeBtn) {
    completeBtn.addEventListener('click', processOrder);
  }
}

/**
 * Proceed to checkout step
 * @param {number} step - Step number to proceed to
 */
function proceedToStep(step) {
  if (step === 2 && !validateShippingForm()) {
    return;
  }
  
  if (step === 3 && !validatePaymentForm()) {
    return;
  }
  
  currentStep = step;
  updateStepDisplay();
  updateProgressIndicator();
}

/**
 * Update step display
 */
function updateStepDisplay() {
  const steps = document.querySelectorAll('.checkout-step');
  
  steps.forEach((step, index) => {
    step.classList.toggle('active', index + 1 === currentStep);
  });
  
  // Scroll to top of form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Update progress indicator
 */
function updateProgressIndicator() {
  const progressSteps = document.querySelectorAll('.progress-steps .step');
  
  progressSteps.forEach((step, index) => {
    step.classList.toggle('active', index + 1 <= currentStep);
  });
}

// ================================================
// FORM VALIDATION
// ================================================

/**
 * Validate shipping form
 * @returns {boolean} Is valid
 */
function validateShippingForm() {
  const form = document.getElementById('step-1');
  if (!form) return false;
  
  const isValid = TICS.FormValidator.validateForm(form);
  
  if (isValid) {
    // Save shipping data
    const formData = new FormData(form);
    checkoutData.shipping = Object.fromEntries(formData);
  }
  
  return isValid;
}

/**
 * Validate payment form
 * @returns {boolean} Is valid
 */
function validatePaymentForm() {
  const form = document.getElementById('step-2');
  if (!form) return false;
  
  // Validate based on selected payment method
  const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value;
  
  if (paymentMethod === 'card') {
    if (!validateCardForm()) {
      return false;
    }
  }
  
  const isValid = TICS.FormValidator.validateForm(form);
  
  if (isValid) {
    // Save payment data (excluding sensitive info for demo)
    checkoutData.payment = {
      method: paymentMethod,
      // Don't store actual card details in demo
      cardLast4: paymentMethod === 'card' ? 
        form.querySelector('#cardNumber')?.value.slice(-4) : null
    };
  }
  
  return isValid;
}

/**
 * Validate card form specifically
 * @returns {boolean} Is valid
 */
function validateCardForm() {
  const cardNumber = document.getElementById('cardNumber')?.value || '';
  const expiryDate = document.getElementById('expiryDate')?.value || '';
  const cvv = document.getElementById('cvv')?.value || '';
  
  // Basic card number validation (Luhn algorithm would be better)
  if (cardNumber.replace(/\s/g, '').length < 13) {
    TICS.ToastManager.error('Número de tarjeta inválido');
    return false;
  }
  
  // Expiry date validation
  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
    TICS.ToastManager.error('Fecha de expiración inválida (MM/YY)');
    return false;
  }
  
  // CVV validation
  if (cvv.length < 3) {
    TICS.ToastManager.error('CVV inválido');
    return false;
  }
  
  return true;
}

// ================================================
// FORM INPUT FORMATTING
// ================================================

/**
 * Initialize form input formatting
 */
function initFormFormatting() {
  const cardNumberInput = document.getElementById('cardNumber');
  const expiryDateInput = document.getElementById('expiryDate');
  const cvvInput = document.getElementById('cvv');
  
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', formatCardNumber);
  }
  
  if (expiryDateInput) {
    expiryDateInput.addEventListener('input', formatExpiryDate);
  }
  
  if (cvvInput) {
    cvvInput.addEventListener('input', formatCVV);
  }
}

/**
 * Format card number input
 * @param {Event} e - Input event
 */
function formatCardNumber(e) {
  let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
  let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
  
  if (formattedValue.length > 19) { // 16 digits + 3 spaces
    formattedValue = formattedValue.substr(0, 19);
  }
  
  e.target.value = formattedValue;
}

/**
 * Format expiry date input
 * @param {Event} e - Input event
 */
function formatExpiryDate(e) {
  let value = e.target.value.replace(/\D/g, '');
  
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4);
  }
  
  e.target.value = value;
}

/**
 * Format CVV input
 * @param {Event} e - Input event
 */
function formatCVV(e) {
  let value = e.target.value.replace(/\D/g, '');
  
  if (value.length > 4) {
    value = value.substring(0, 4);
  }
  
  e.target.value = value;
}

// ================================================
// PAYMENT METHOD HANDLING
// ================================================

/**
 * Initialize payment method selection
 */
function initPaymentMethods() {
  const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
  
  paymentMethods.forEach(method => {
    method.addEventListener('change', handlePaymentMethodChange);
  });
}

/**
 * Handle payment method change
 * @param {Event} e - Change event
 */
function handlePaymentMethodChange(e) {
  const selectedMethod = e.target.value;
  const cardForm = document.getElementById('card-form');
  
  if (cardForm) {
    cardForm.style.display = selectedMethod === 'card' ? 'block' : 'none';
  }
  
  // Clear card form if switching away from card
  if (selectedMethod !== 'card') {
    clearCardForm();
  }
}

/**
 * Clear card form fields
 */
function clearCardForm() {
  const cardInputs = ['cardNumber', 'expiryDate', 'cvv', 'cardName'];
  
  cardInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.value = '';
      TICS.FormValidator.clearError(input);
    }
  });
}

// ================================================
// ORDER PROCESSING
// ================================================

/**
 * Process the order
 */
async function processOrder() {
  if (!validatePaymentForm()) {
    TICS.ToastManager.error('Por favor, completa todos los campos requeridos');
    return;
  }
  
  try {
    // Show loading
    TICS.LoadingManager.show();
    
    // Simulate order processing
    await simulateOrderProcessing();
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Show confirmation
    showOrderConfirmation(orderNumber);
    
    // Clear cart
    if (window.CartManager) {
      window.CartManager.clearCart();
    }
    
    // Save order data
    saveOrderData(orderNumber);
    
  } catch (error) {
    console.error('Order processing error:', error);
    TICS.ToastManager.error('Error al procesar el pedido. Por favor, intenta nuevamente.');
  } finally {
    TICS.LoadingManager.hide();
  }
}

/**
 * Simulate order processing delay
 */
function simulateOrderProcessing() {
  return new Promise((resolve) => {
    setTimeout(resolve, 2000 + Math.random() * 1000); // 2-3 seconds
  });
}

/**
 * Generate order number
 * @returns {string} Order number
 */
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TICS-${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
}

/**
 * Show order confirmation
 * @param {string} orderNumber - Generated order number
 */
function showOrderConfirmation(orderNumber) {
  // Update order number in confirmation
  const orderNumberElement = document.getElementById('order-number');
  if (orderNumberElement) {
    orderNumberElement.textContent = orderNumber;
  }
  
  // Move to confirmation step
  proceedToStep(3);
  
  // Show success message
  TICS.ToastManager.success('¡Pedido confirmado exitosamente!');
  
  // Add confetti effect (simple animation)
  addConfettiEffect();
}

/**
 * Add simple confetti effect
 */
function addConfettiEffect() {
  const confirmationIcon = document.querySelector('.confirmation-icon');
  if (!confirmationIcon) return;
  
  confirmationIcon.style.animation = 'bounce 0.6s ease-in-out';
  
  setTimeout(() => {
    confirmationIcon.style.animation = '';
  }, 600);
}

/**
 * Save order data for demo purposes
 * @param {string} orderNumber - Order number
 */
function saveOrderData(orderNumber) {
  const orderData = {
    orderNumber,
    shipping: checkoutData.shipping,
    payment: {
      method: checkoutData.payment.method,
      // Don't save sensitive payment info
    },
    items: checkoutData.orderItems.map(item => ({
      productId: item.productId,
      title: item.title,
      quantity: item.quantity,
      price: item.price,
      variants: item.variants
    })),
    totals: window.CartManager?.calculateCartTotals() || {},
    createdAt: new Date().toISOString(),
    status: 'confirmed'
  };
  
  // Save to localStorage for demo
  const orders = TICS.StorageManager.load('user-orders', []);
  orders.unshift(orderData); // Add to beginning
  
  // Keep only last 10 orders
  if (orders.length > 10) {
    orders.splice(10);
  }
  
  TICS.StorageManager.save('user-orders', orders);
}

// ================================================
// ORDER SUMMARY
// ================================================

/**
 * Update order summary display
 */
function updateOrderSummary() {
  const orderItemsContainer = document.getElementById('checkout-items');
  const totals = window.CartManager?.calculateCartTotals() || {};
  
  if (orderItemsContainer && checkoutData.orderItems.length > 0) {
    const itemsHTML = checkoutData.orderItems.map(item => `
      <div class="order-item">
        <div class="order-item-image">
          <img src="${item.image}" alt="${TICS.sanitizeHTML(item.title)}" loading="lazy">
        </div>
        <div class="order-item-info">
          <h4>${TICS.sanitizeHTML(item.title)}</h4>
          <p>Cantidad: ${item.quantity}</p>
          ${Object.keys(item.variants || {}).length > 0 ? 
            `<p>${Object.entries(item.variants).map(([key, value]) => `${key}: ${value}`).join(', ')}</p>` : 
            ''}
        </div>
        <div class="order-item-price">${TICS.formatCurrency(item.price * item.quantity)}</div>
      </div>
    `).join('');
    
    orderItemsContainer.innerHTML = itemsHTML;
  }
  
  // Update totals
  updateCheckoutTotals(totals);
}

/**
 * Update checkout totals display
 * @param {Object} totals - Cart totals
 */
function updateCheckoutTotals(totals) {
  const elements = {
    'checkout-subtotal': TICS.formatCurrency(totals.subtotal || 0),
    'checkout-shipping': totals.shippingText || 'Gratis',
    'checkout-tax': TICS.formatCurrency(totals.tax || 0),
    'checkout-total': TICS.formatCurrency(totals.total || 0)
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

// ================================================
// FORM INITIALIZATION
// ================================================

/**
 * Initialize checkout forms
 */
function initCheckoutForms() {
  initFormFormatting();
  initPaymentMethods();
  initAddressAutocomplete();
  initFormPersistence();
}

/**
 * Initialize address autocomplete (placeholder)
 */
function initAddressAutocomplete() {
  // This would integrate with a service like Google Places API
  // For now, just add some basic validation
  
  const addressInput = document.getElementById('address');
  if (addressInput) {
    addressInput.addEventListener('blur', validateAddress);
  }
}

/**
 * Validate address (placeholder)
 * @param {Event} e - Blur event
 */
function validateAddress(e) {
  const address = e.target.value.trim();
  
  if (address.length < 5) {
    TICS.FormValidator.showError(e.target, 'Ingresa una dirección válida');
  } else {
    TICS.FormValidator.clearError(e.target);
  }
}

/**
 * Initialize form persistence
 */
function initFormPersistence() {
  // Save form data as user types (excluding sensitive payment info)
  const shippingInputs = document.querySelectorAll('#step-1 input, #step-1 select');
  
  shippingInputs.forEach(input => {
    // Load saved value
    const savedValue = TICS.StorageManager.load(`checkout-${input.name}`, '');
    if (savedValue && input.type !== 'password') {
      input.value = savedValue;
    }
    
    // Save on change
    input.addEventListener('input', TICS.debounce(() => {
      if (input.type !== 'password') {
        TICS.StorageManager.save(`checkout-${input.name}`, input.value);
      }
    }, 500));
  });
}

// ================================================
// KEYBOARD SHORTCUTS
// ================================================

/**
 * Initialize keyboard shortcuts
 */
function initCheckoutKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only activate if not in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    switch (e.key) {
      case 'ArrowRight':
        if (currentStep < 3) {
          e.preventDefault();
          const continueBtn = document.getElementById(
            currentStep === 1 ? 'continue-to-payment' : 'complete-order'
          );
          if (continueBtn && !continueBtn.disabled) {
            continueBtn.click();
          }
        }
        break;
        
      case 'ArrowLeft':
        if (currentStep > 1 && currentStep < 3) {
          e.preventDefault();
          const backBtn = document.getElementById('back-to-shipping');
          if (backBtn) {
            backBtn.click();
          }
        }
        break;
    }
  });
}

// ================================================
// INITIALIZATION
// ================================================

// Initialize checkout when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the checkout page
  if (window.location.pathname.includes('checkout.html') || 
      document.getElementById('checkout-form')) {
    
    // Wait for cart to be initialized
    setTimeout(() => {
      initCheckout();
      initCheckoutKeyboardShortcuts();
    }, 300);
  }
});