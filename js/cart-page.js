/*
  TICS Store - Cart Page Specific Functionality
  
  This module handles:
  - Cart page initialization and display
  - Interactive cart item management
  - Real-time total calculations
  - Promo code interface
  - Empty cart states
*/

// ================================================
// CART PAGE INITIALIZATION
// ================================================

/**
 * Initialize cart page functionality
 */
function initCartPage() {
  console.log('Initializing cart page...');
  
  // Update cart display immediately
  updateCartDisplay();
  
  // Initialize promo code functionality
  initPromoCodeInterface();
  
  // Initialize additional cart page features
  initCartPageFeatures();
  
  console.log('Cart page initialized successfully!');
}

/**
 * Update cart display on page load
 */
function updateCartDisplay() {
  // This will be handled by the main cart.js updateCartUI function
  if (window.CartManager) {
    // Trigger cart UI update
    window.updateCartCount();
  }
}

// ================================================
// PROMO CODE INTERFACE
// ================================================

/**
 * Initialize promo code interface
 */
function initPromoCodeInterface() {
  const promoInput = document.getElementById('promo-input');
  const applyPromoBtn = document.getElementById('apply-promo');
  
  if (!promoInput || !applyPromoBtn) return;
  
  // Enable/disable apply button based on input
  promoInput.addEventListener('input', (e) => {
    const hasValue = e.target.value.trim().length > 0;
    applyPromoBtn.disabled = !hasValue;
    applyPromoBtn.classList.toggle('btn-secondary', !hasValue);
    applyPromoBtn.classList.toggle('btn-primary', hasValue);
  });
  
  // Show available promo codes hint
  addPromoCodeHints();
}

/**
 * Add promo code hints to the interface
 */
function addPromoCodeHints() {
  const promoCodeSection = document.querySelector('.promo-code');
  if (!promoCodeSection) return;
  
  // Add hint about available codes (for demo purposes)
  const hintsElement = document.createElement('div');
  hintsElement.className = 'promo-hints';
  hintsElement.innerHTML = `
    <small style="color: var(--gray-500); font-size: var(--font-size-xs); margin-top: var(--spacing-sm); display: block;">
      💡 Prueba estos códigos: BIENVENIDO, ENVIO5, ESTUDIANTE
    </small>
  `;
  
  promoCodeSection.appendChild(hintsElement);
}

// ================================================
// CART PAGE FEATURES
// ================================================

/**
 * Initialize additional cart page features
 */
function initCartPageFeatures() {
  initQuantityAnimations();
  initRemoveConfirmation();
  initContinueShoppingTracking();
  initCartSummarySticky();
}

/**
 * Initialize quantity change animations
 */
function initQuantityAnimations() {
  // Add visual feedback when quantities change
  document.addEventListener('click', (e) => {
    if (e.target.matches('.qty-btn')) {
      const cartItem = e.target.closest('.cart-item');
      if (cartItem) {
        addQuantityChangeAnimation(cartItem);
      }
    }
  });
}

/**
 * Add animation feedback for quantity changes
 * @param {HTMLElement} cartItem - Cart item element
 */
function addQuantityChangeAnimation(cartItem) {
  cartItem.style.transform = 'scale(0.98)';
  cartItem.style.transition = 'transform 0.2s ease';
  
  setTimeout(() => {
    cartItem.style.transform = 'scale(1)';
  }, 200);
}

/**
 * Initialize remove item confirmation
 */
function initRemoveConfirmation() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.remove-item')) {
      e.preventDefault();
      showRemoveConfirmation(e.target);
    }
  });
}

/**
 * Show confirmation before removing item
 * @param {HTMLElement} removeBtn - Remove button element
 */
function showRemoveConfirmation(removeBtn) {
  const cartItem = removeBtn.closest('.cart-item');
  const itemTitle = cartItem.querySelector('h3')?.textContent || 'este producto';
  
  const confirmed = confirm(`¿Estás seguro de que quieres eliminar "${itemTitle}" del carrito?`);
  
  if (confirmed && cartItem.dataset.itemId) {
    // Add removal animation
    cartItem.style.opacity = '0.5';
    cartItem.style.transform = 'translateX(-100%)';
    cartItem.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      if (window.CartManager) {
        window.CartManager.removeFromCart(cartItem.dataset.itemId);
      }
    }, 300);
  }
}

/**
 * Initialize continue shopping link tracking
 */
function initContinueShoppingTracking() {
  const continueShoppingLinks = document.querySelectorAll('.continue-shopping');
  
  continueShoppingLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Save cart state before leaving
      saveCartInteractionData();
    });
  });
}

/**
 * Initialize sticky cart summary
 */
function initCartSummarySticky() {
  const cartSummary = document.querySelector('.cart-summary');
  if (!cartSummary) return;
  
  // Add intersection observer to make summary sticky on scroll
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          cartSummary.classList.remove('floating');
        } else {
          cartSummary.classList.add('floating');
        }
      });
    },
    { rootMargin: '-100px 0px 0px 0px' }
  );
  
  observer.observe(cartSummary);
}

// ================================================
// CART ANALYTICS & TRACKING
// ================================================

/**
 * Save cart interaction data for analytics
 */
function saveCartInteractionData() {
  const cart = window.CartManager?.getCart() || [];
  const cartData = {
    items: cart.length,
    totalValue: calculateCartValue(cart),
    timestamp: new Date().toISOString(),
    page: 'cart'
  };
  
  // Save to localStorage for demo analytics
  const analytics = TICS.StorageManager.load('cart-analytics', []);
  analytics.push(cartData);
  
  // Keep only last 50 entries
  if (analytics.length > 50) {
    analytics.splice(0, analytics.length - 50);
  }
  
  TICS.StorageManager.save('cart-analytics', analytics);
}

/**
 * Calculate total cart value
 * @param {Array} cart - Cart items
 * @returns {number} Total value
 */
function calculateCartValue(cart) {
  return cart.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

// ================================================
// EMPTY CART EXPERIENCE
// ================================================

/**
 * Enhance empty cart experience
 */
function enhanceEmptyCartExperience() {
  const emptyCart = document.getElementById('empty-cart');
  if (!emptyCart) return;
  
  // Add product suggestions to empty cart
  if (window.ProductsManager) {
    addEmptyCartSuggestions(emptyCart);
  }
}

/**
 * Add product suggestions to empty cart
 * @param {HTMLElement} emptyCartElement - Empty cart element
 */
function addEmptyCartSuggestions(emptyCartElement) {
  // Create suggestions container
  const suggestionsContainer = document.createElement('div');
  suggestionsContainer.className = 'empty-cart-suggestions';
  suggestionsContainer.innerHTML = `
    <h3>Productos que podrían interesarte</h3>
    <div class="suggestions-grid" id="empty-cart-suggestions-grid">
      <!-- Suggestions will be loaded here -->
    </div>
  `;
  
  emptyCartElement.appendChild(suggestionsContainer);
  
  // Load featured products as suggestions
  setTimeout(async () => {
    try {
      await window.ProductsManager.loadProducts();
      const featured = window.ProductsManager.getFeaturedProducts();
      const suggestionsGrid = document.getElementById('empty-cart-suggestions-grid');
      
      if (suggestionsGrid && featured.length > 0) {
        window.ProductsManager.renderProductsGrid(
          featured.slice(0, 4), 
          suggestionsGrid, 
          true
        );
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }, 500);
}

// ================================================
// CART SHARING (FUTURE FEATURE)
// ================================================

/**
 * Initialize cart sharing functionality
 */
function initCartSharing() {
  // Add share cart button
  const cartActions = document.querySelector('.cart-actions');
  if (!cartActions) return;
  
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-outline share-cart-btn';
  shareBtn.innerHTML = '🔗 Compartir Carrito';
  shareBtn.style.display = 'none'; // Hidden for now, future feature
  
  shareBtn.addEventListener('click', shareCart);
  cartActions.appendChild(shareBtn);
}

/**
 * Share cart functionality (placeholder)
 */
function shareCart() {
  const cart = window.CartManager?.getCart() || [];
  if (cart.length === 0) return;
  
  // Generate shareable cart data
  const shareableCart = {
    items: cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      variants: item.variants
    })),
    createdAt: new Date().toISOString()
  };
  
  // For demo, just copy to clipboard
  const shareData = JSON.stringify(shareableCart);
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareData).then(() => {
      TICS.ToastManager.success('Datos del carrito copiados al portapapeles');
    });
  } else {
    TICS.ToastManager.info('Función de compartir disponible próximamente');
  }
}

// ================================================
// CART PAGE KEYBOARD SHORTCUTS
// ================================================

/**
 * Initialize keyboard shortcuts for cart page
 */
function initCartKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only activate if not in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch (e.key) {
      case 'c':
      case 'C':
        // Continue shopping
        e.preventDefault();
        window.location.href = 'shop.html';
        break;
        
      case 'Enter':
        // Proceed to checkout if cart has items
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn && !checkoutBtn.disabled) {
          e.preventDefault();
          checkoutBtn.click();
        }
        break;
    }
  });
}

// ================================================
// RESPONSIVE CART ADJUSTMENTS
// ================================================

/**
 * Handle responsive adjustments for cart page
 */
function handleCartResponsive() {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  function handleScreenChange(e) {
    const cartLayout = document.querySelector('.cart-layout');
    if (!cartLayout) return;
    
    if (e.matches) {
      // Mobile view adjustments
      cartLayout.style.gridTemplateColumns = '1fr';
    } else {
      // Desktop view
      cartLayout.style.gridTemplateColumns = '2fr 1fr';
    }
  }
  
  // Initial check
  handleScreenChange(mediaQuery);
  
  // Listen for changes
  mediaQuery.addListener(handleScreenChange);
}

// ================================================
// INITIALIZATION
// ================================================

// Initialize cart page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the cart page
  if (window.location.pathname.includes('cart.html') || 
      document.getElementById('cart-items')) {
    
    // Wait a bit for cart.js to initialize
    setTimeout(() => {
      initCartPage();
      enhanceEmptyCartExperience();
      initCartSharing();
      initCartKeyboardShortcuts();
      handleCartResponsive();
      
      // Save analytics
      saveCartInteractionData();
    }, 300);
  }
});