/*
  TICS Store - Shopping Cart Management
  
  This module handles:
  - Adding/removing items from cart
  - Updating cart quantities
  - Cart persistence with localStorage
  - Cart calculations (subtotal, tax, total)
  - Cart display and UI updates
  - Promo code functionality
  
  CUSTOMIZATION:
  - Modify TAX_RATE for different tax calculations
  - Adjust FREE_SHIPPING_THRESHOLD for shipping rules
  - Change PROMO_CODES for different discount codes
  - Modify cart item template in createCartItemHTML()
*/

// ================================================
// CONFIGURATION
// ================================================
const CART_CONFIG = {
  TAX_RATE: 0.21, // 21% IVA
  FREE_SHIPPING_THRESHOLD: 50, // Free shipping over €50
  SHIPPING_COST: 4.99,
  MAX_QUANTITY: 99,
  STORAGE_KEY: TICS.CONFIG.STORAGE_KEYS.CART,
  
  // Available promo codes
  PROMO_CODES: {
    'BIENVENIDO': { type: 'percentage', value: 10, description: '10% de descuento' },
    'ENVIO5': { type: 'fixed', value: 5, description: '5€ de descuento' },
    'ESTUDIANTE': { type: 'percentage', value: 15, description: '15% descuento estudiantes' }
  }
};

// ================================================
// CART STATE
// ================================================
let cart = [];
let appliedPromoCode = null;

// ================================================
// CART ITEM MANAGEMENT
// ================================================

/**
 * Add item to cart
 * @param {Object} product - Product to add
 * @param {number} quantity - Quantity to add
 * @param {Object} variants - Selected product variants
 */
function addToCart(product, quantity = 1, variants = {}) {
  if (!product || quantity <= 0) return;
  
  // Check stock availability
  if (product.stock < quantity) {
    TICS.ToastManager.error(`Solo quedan ${product.stock} unidades disponibles`);
    return;
  }
  
  // Create cart item ID based on product and variants
  const itemId = generateCartItemId(product.id, variants);
  
  // Check if item already exists in cart
  const existingItem = cart.find(item => item.itemId === itemId);
  
  if (existingItem) {
    // Update quantity of existing item
    const newQuantity = existingItem.quantity + quantity;
    updateCartItemQuantity(itemId, newQuantity);
  } else {
    // Add new item to cart
    const cartItem = {
      itemId,
      productId: product.id,
      title: product.title,
      price: product.salePrice || product.price,
      originalPrice: product.price,
      image: product.images[0],
      quantity,
      variants,
      addedAt: new Date().toISOString()
    };
    
    cart.push(cartItem);
    saveCart();
    updateCartUI();
    
    TICS.ToastManager.success(`${product.title} añadido al carrito`);
  }
}

/**
 * Remove item from cart
 * @param {string} itemId - Cart item ID
 */
function removeFromCart(itemId) {
  const itemIndex = cart.findIndex(item => item.itemId === itemId);
  
  if (itemIndex !== -1) {
    const item = cart[itemIndex];
    cart.splice(itemIndex, 1);
    saveCart();
    updateCartUI();
    
    TICS.ToastManager.success(`${item.title} eliminado del carrito`);
  }
}

/**
 * Update cart item quantity
 * @param {string} itemId - Cart item ID
 * @param {number} newQuantity - New quantity
 */
function updateCartItemQuantity(itemId, newQuantity) {
  const item = cart.find(item => item.itemId === itemId);
  
  if (!item) return;
  
  // Validate quantity
  if (newQuantity <= 0) {
    removeFromCart(itemId);
    return;
  }
  
  if (newQuantity > CART_CONFIG.MAX_QUANTITY) {
    TICS.ToastManager.error(`Cantidad máxima permitida: ${CART_CONFIG.MAX_QUANTITY}`);
    return;
  }
  
  // Check stock (assuming we have access to product data)
  const product = window.ProductsManager?.getProductById(item.productId);
  if (product && product.stock < newQuantity) {
    TICS.ToastManager.error(`Solo quedan ${product.stock} unidades disponibles`);
    return;
  }
  
  item.quantity = newQuantity;
  saveCart();
  updateCartUI();
}

/**
 * Clear all items from cart
 */
function clearCart() {
  cart = [];
  appliedPromoCode = null;
  saveCart();
  updateCartUI();
  TICS.ToastManager.success('Carrito vaciado');
}

/**
 * Generate unique cart item ID
 * @param {number} productId - Product ID
 * @param {Object} variants - Product variants
 * @returns {string} Unique item ID
 */
function generateCartItemId(productId, variants = {}) {
  const variantString = Object.keys(variants)
    .sort()
    .map(key => `${key}:${variants[key]}`)
    .join('|');
  
  return `${productId}-${variantString}`;
}

// ================================================
// CART CALCULATIONS
// ================================================

/**
 * Calculate cart subtotal (before tax and shipping)
 * @returns {number} Subtotal amount
 */
function calculateSubtotal() {
  return cart.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

/**
 * Calculate tax amount
 * @param {number} subtotal - Subtotal amount
 * @returns {number} Tax amount
 */
function calculateTax(subtotal) {
  return subtotal * CART_CONFIG.TAX_RATE;
}

/**
 * Calculate shipping cost
 * @param {number} subtotal - Subtotal amount
 * @returns {number} Shipping cost
 */
function calculateShipping(subtotal) {
  return subtotal >= CART_CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CART_CONFIG.SHIPPING_COST;
}

/**
 * Apply promo code discount
 * @param {number} subtotal - Subtotal amount
 * @param {string} promoCode - Promo code
 * @returns {number} Discount amount
 */
function calculateDiscount(subtotal, promoCode) {
  if (!promoCode || !CART_CONFIG.PROMO_CODES[promoCode]) {
    return 0;
  }
  
  const promo = CART_CONFIG.PROMO_CODES[promoCode];
  
  if (promo.type === 'percentage') {
    return subtotal * (promo.value / 100);
  } else if (promo.type === 'fixed') {
    return Math.min(promo.value, subtotal); // Don't discount more than subtotal
  }
  
  return 0;
}

/**
 * Calculate cart totals
 * @returns {Object} Cart totals object
 */
function calculateCartTotals() {
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount(subtotal, appliedPromoCode);
  const discountedSubtotal = subtotal - discount;
  const tax = calculateTax(discountedSubtotal);
  const shipping = calculateShipping(subtotal);
  const total = discountedSubtotal + tax + shipping;
  
  return {
    itemCount: cart.reduce((count, item) => count + item.quantity, 0),
    subtotal,
    discount,
    discountedSubtotal,
    tax,
    shipping,
    shippingText: shipping === 0 ? 'Gratis' : TICS.formatCurrency(shipping),
    total
  };
}

// ================================================
// PROMO CODE MANAGEMENT
// ================================================

/**
 * Apply promo code
 * @param {string} code - Promo code to apply
 * @returns {boolean} Success status
 */
function applyPromoCode(code) {
  const upperCode = code.toUpperCase().trim();
  
  if (!CART_CONFIG.PROMO_CODES[upperCode]) {
    return false;
  }
  
  appliedPromoCode = upperCode;
  saveCart();
  updateCartUI();
  
  const promo = CART_CONFIG.PROMO_CODES[upperCode];
  TICS.ToastManager.success(`Código aplicado: ${promo.description}`);
  
  return true;
}

/**
 * Remove applied promo code
 */
function removePromoCode() {
  appliedPromoCode = null;
  saveCart();
  updateCartUI();
  TICS.ToastManager.success('Código de descuento eliminado');
}

// ================================================
// CART PERSISTENCE
// ================================================

/**
 * Save cart to localStorage
 */
function saveCart() {
  const cartData = {
    items: cart,
    promoCode: appliedPromoCode,
    updatedAt: new Date().toISOString()
  };
  
  TICS.StorageManager.save(CART_CONFIG.STORAGE_KEY, cartData);
}

/**
 * Load cart from localStorage
 */
function loadCart() {
  const cartData = TICS.StorageManager.load(CART_CONFIG.STORAGE_KEY, { items: [] });
  
  cart = cartData.items || [];
  appliedPromoCode = cartData.promoCode || null;
  
  updateCartUI();
}

// ================================================
// CART UI UPDATES
// ================================================

/**
 * Update cart count in navigation
 */
function updateCartCount() {
  const cartCountElements = document.querySelectorAll('.cart-count');
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);
  
  cartCountElements.forEach(element => {
    element.textContent = itemCount;
    element.style.display = itemCount > 0 ? 'inline' : 'none';
  });
}

/**
 * Update all cart UI elements
 */
function updateCartUI() {
  updateCartCount();
  updateCartPage();
  updateCheckoutSummary();
}

/**
 * Update cart page display
 */
function updateCartPage() {
  const cartItemsContainer = document.getElementById('cart-items');
  const emptyCartContainer = document.getElementById('empty-cart');
  
  if (!cartItemsContainer) return;
  
  if (cart.length === 0) {
    cartItemsContainer.style.display = 'none';
    if (emptyCartContainer) {
      emptyCartContainer.style.display = 'block';
    }
    return;
  }
  
  cartItemsContainer.style.display = 'block';
  if (emptyCartContainer) {
    emptyCartContainer.style.display = 'none';
  }
  
  // Render cart items
  cartItemsContainer.innerHTML = cart.map(item => createCartItemHTML(item)).join('');
  
  // Add event listeners
  attachCartItemEventListeners();
  
  // Update totals
  updateCartTotals();
}

/**
 * Create HTML for cart item
 * @param {Object} item - Cart item
 * @returns {string} HTML string
 */
function createCartItemHTML(item) {
  const variants = Object.keys(item.variants).length > 0 
    ? Object.entries(item.variants).map(([key, value]) => `${key}: ${value}`).join(', ')
    : '';
  
  return `
    <div class="cart-item" data-item-id="${item.itemId}">
      <div class="cart-item-image">
        <img src="${item.image}" alt="${TICS.sanitizeHTML(item.title)}" loading="lazy">
      </div>
      
      <div class="cart-item-info">
        <h3>${TICS.sanitizeHTML(item.title)}</h3>
        ${variants ? `<p class="variants">${TICS.sanitizeHTML(variants)}</p>` : ''}
        <p class="item-price">Precio: ${TICS.formatCurrency(item.price)}</p>
      </div>
      
      <div class="cart-item-quantity">
        <div class="quantity-control">
          <button class="qty-btn qty-minus" data-action="decrease">-</button>
          <input type="number" value="${item.quantity}" min="1" max="${CART_CONFIG.MAX_QUANTITY}" readonly>
          <button class="qty-btn qty-plus" data-action="increase">+</button>
        </div>
      </div>
      
      <div class="cart-item-price">
        <span class="price">${TICS.formatCurrency(item.price * item.quantity)}</span>
        <button class="remove-item" title="Eliminar producto">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to cart items
 */
function attachCartItemEventListeners() {
  // Quantity controls
  document.querySelectorAll('.cart-item .qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cartItem = e.target.closest('.cart-item');
      const itemId = cartItem.dataset.itemId;
      const action = e.target.dataset.action;
      const currentItem = cart.find(item => item.itemId === itemId);
      
      if (!currentItem) return;
      
      if (action === 'increase') {
        updateCartItemQuantity(itemId, currentItem.quantity + 1);
      } else if (action === 'decrease') {
        updateCartItemQuantity(itemId, currentItem.quantity - 1);
      }
    });
  });
  
  // Remove item buttons
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cartItem = e.target.closest('.cart-item');
      const itemId = cartItem.dataset.itemId;
      removeFromCart(itemId);
    });
  });
}

/**
 * Update cart totals display
 */
function updateCartTotals() {
  const totals = calculateCartTotals();
  
  // Update various total elements
  const elements = {
    'cart-item-count': totals.itemCount,
    'cart-subtotal': TICS.formatCurrency(totals.subtotal),
    'cart-tax': TICS.formatCurrency(totals.tax),
    'cart-total': TICS.formatCurrency(totals.total),
    'shipping-cost': totals.shippingText,
    'checkout-subtotal': TICS.formatCurrency(totals.subtotal),
    'checkout-tax': TICS.formatCurrency(totals.tax),
    'checkout-total': TICS.formatCurrency(totals.total),
    'checkout-shipping': totals.shippingText
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
  
  // Enable/disable checkout button
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }
  
  // Update discount display if applicable
  if (appliedPromoCode && totals.discount > 0) {
    updateDiscountDisplay(totals.discount);
  }
}

/**
 * Update discount display
 * @param {number} discountAmount - Discount amount
 */
function updateDiscountDisplay(discountAmount) {
  // Add discount line to summary if not exists
  let discountLine = document.querySelector('.summary-line.discount');
  
  if (!discountLine) {
    const summaryCard = document.querySelector('.summary-card');
    if (!summaryCard) return;
    
    const totalLine = summaryCard.querySelector('.summary-line.total');
    if (!totalLine) return;
    
    discountLine = document.createElement('div');
    discountLine.className = 'summary-line discount';
    discountLine.innerHTML = `
      <span>Descuento (${appliedPromoCode})</span>
      <span class="discount-amount">-${TICS.formatCurrency(discountAmount)}</span>
    `;
    
    totalLine.parentNode.insertBefore(discountLine, totalLine);
  } else {
    // Update existing discount line
    const discountAmountElement = discountLine.querySelector('.discount-amount');
    if (discountAmountElement) {
      discountAmountElement.textContent = `-${TICS.formatCurrency(discountAmount)}`;
    }
  }
}

/**
 * Update checkout summary (for checkout page)
 */
function updateCheckoutSummary() {
  const checkoutItemsContainer = document.getElementById('checkout-items');
  
  if (!checkoutItemsContainer) return;
  
  // Render checkout items
  const checkoutItemsHTML = cart.map(item => `
    <div class="order-item">
      <div class="order-item-image">
        <img src="${item.image}" alt="${TICS.sanitizeHTML(item.title)}" loading="lazy">
      </div>
      <div class="order-item-info">
        <h4>${TICS.sanitizeHTML(item.title)}</h4>
        <p>Cantidad: ${item.quantity}</p>
      </div>
      <div class="order-item-price">${TICS.formatCurrency(item.price * item.quantity)}</div>
    </div>
  `).join('');
  
  checkoutItemsContainer.innerHTML = checkoutItemsHTML;
}

// ================================================
// PROMO CODE UI
// ================================================

/**
 * Initialize promo code functionality
 */
function initPromoCode() {
  const promoInput = document.getElementById('promo-input');
  const applyPromoBtn = document.getElementById('apply-promo');
  const promoMessage = document.getElementById('promo-message');
  
  if (!promoInput || !applyPromoBtn) return;
  
  applyPromoBtn.addEventListener('click', () => {
    const code = promoInput.value.trim();
    
    if (!code) {
      showPromoMessage('Ingresa un código de descuento', 'error');
      return;
    }
    
    if (applyPromoCode(code)) {
      promoInput.value = '';
      showPromoMessage(`Código aplicado: ${CART_CONFIG.PROMO_CODES[code.toUpperCase()].description}`, 'success');
    } else {
      showPromoMessage('Código no válido', 'error');
    }
  });
  
  // Allow enter key to apply promo
  promoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyPromoBtn.click();
    }
  });
}

/**
 * Show promo code message
 * @param {string} message - Message to show
 * @param {string} type - Message type: 'success' or 'error'
 */
function showPromoMessage(message, type) {
  const promoMessage = document.getElementById('promo-message');
  if (!promoMessage) return;
  
  promoMessage.textContent = message;
  promoMessage.className = `promo-message ${type}`;
  
  setTimeout(() => {
    promoMessage.textContent = '';
    promoMessage.className = 'promo-message';
  }, 3000);
}

// ================================================
// INITIALIZATION
// ================================================

/**
 * Initialize cart functionality
 */
function initCart() {
  loadCart();
  initPromoCode();
  
  // Add checkout button handler
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        TICS.ToastManager.error('Tu carrito está vacío');
        return;
      }
      
      window.location.href = 'checkout.html';
    });
  }
  
  // Initial UI update
  updateCartUI();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCart);

// Export functions for global use
window.CartManager = {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  calculateCartTotals,
  applyPromoCode,
  removePromoCode,
  updateCartCount,
  getCart: () => [...cart], // Return copy of cart
  getCartItemCount: () => cart.reduce((count, item) => count + item.quantity, 0)
};

// Make addToCart globally available for product cards
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;