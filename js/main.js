/*
  TICS Store - Main JavaScript
  
  CUSTOMIZATION GUIDE:
  1. Theme colors can be changed by modifying CSS custom properties
  2. Animation durations can be adjusted in the constants section
  3. API endpoints and localStorage keys can be modified in the constants
  4. Utility functions are reusable across the entire application
  
  MAIN FEATURES:
  - Mobile navigation toggle
  - Loading spinner management
  - Toast notification system
  - Form validation utilities
  - Image lazy loading
  - Smooth scrolling
  - Theme management
*/

// ================================================
// CONSTANTS & CONFIGURATION
// ================================================
const CONFIG = {
  // Animation durations (in milliseconds)
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 4000,
  LOADING_MIN_DURATION: 500,
  
  // LocalStorage keys
  STORAGE_KEYS: {
    CART: 'tics-store-cart',
    USER_PREFERENCES: 'tics-store-preferences',
    SEARCH_HISTORY: 'tics-store-search-history'
  },
  
  // API endpoints (for future backend integration)
  API_ENDPOINTS: {
    PRODUCTS: 'data/products.json',
    NEWSLETTER: '/api/newsletter',
    CONTACT: '/api/contact'
  },
  
  // Validation patterns
  VALIDATION: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[\+]?[0-9\s\-\(\)]{8,}$/,
    POSTAL_CODE: /^[0-9]{5}$/
  }
};

// ================================================
// DOM ELEMENTS
// ================================================
const DOM = {
  // Navigation
  navbar: document.getElementById('navbar'),
  navToggle: document.getElementById('nav-toggle'),
  navMenu: document.getElementById('nav-menu'),
  cartCount: document.getElementById('cart-count'),
  
  // Loading & Notifications
  loadingSpinner: document.getElementById('loading-spinner'),
  toastContainer: document.getElementById('toast-container'),
  
  // Search
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  searchSuggestions: document.getElementById('search-suggestions')
};

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Format currency values
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'EUR')
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format date values
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get query parameter from URL
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Set query parameter in URL
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
function setQueryParam(param, value) {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  window.history.replaceState({}, '', url);
}

// ================================================
// LOADING SPINNER MANAGEMENT
// ================================================
const LoadingManager = {
  show() {
    if (DOM.loadingSpinner) {
      DOM.loadingSpinner.classList.add('show');
    }
  },
  
  hide() {
    if (DOM.loadingSpinner) {
      // Ensure minimum loading duration for better UX
      setTimeout(() => {
        DOM.loadingSpinner.classList.remove('show');
      }, CONFIG.LOADING_MIN_DURATION);
    }
  },
  
  // Show loading with minimum duration
  async withLoading(asyncFunction) {
    this.show();
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      this.hide();
    }
  }
};

// ================================================
// TOAST NOTIFICATION SYSTEM
// ================================================
const ToastManager = {
  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds
   */
  show(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    if (!DOM.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = sanitizeHTML(message);
    
    // Add toast to container
    DOM.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove toast after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, CONFIG.ANIMATION_DURATION);
    }, duration);
    
    // Allow manual dismissal on click
    toast.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, CONFIG.ANIMATION_DURATION);
    });
  },
  
  success(message, duration) {
    this.show(message, 'success', duration);
  },
  
  error(message, duration) {
    this.show(message, 'error', duration);
  },
  
  warning(message, duration) {
    this.show(message, 'warning', duration);
  }
};

// ================================================
// FORM VALIDATION
// ================================================
const FormValidator = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    return CONFIG.VALIDATION.EMAIL.test(email);
  },
  
  /**
   * Validate phone format
   * @param {string} phone - Phone to validate
   * @returns {boolean} Is valid phone
   */
  isValidPhone(phone) {
    return CONFIG.VALIDATION.PHONE.test(phone);
  },
  
  /**
   * Validate postal code format
   * @param {string} postalCode - Postal code to validate
   * @returns {boolean} Is valid postal code
   */
  isValidPostalCode(postalCode) {
    return CONFIG.VALIDATION.POSTAL_CODE.test(postalCode);
  },
  
  /**
   * Validate required field
   * @param {string} value - Value to validate
   * @returns {boolean} Is not empty
   */
  isRequired(value) {
    return value && value.trim().length > 0;
  },
  
  /**
   * Validate minimum length
   * @param {string} value - Value to validate
   * @param {number} minLength - Minimum length required
   * @returns {boolean} Meets minimum length
   */
  hasMinLength(value, minLength) {
    return value && value.length >= minLength;
  },
  
  /**
   * Show validation error for field
   * @param {HTMLElement} field - Form field element
   * @param {string} message - Error message
   */
  showError(field, message) {
    field.classList.add('error');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.color = 'var(--danger-color)';
    errorElement.style.fontSize = 'var(--font-size-sm)';
    errorElement.style.marginTop = 'var(--spacing-xs)';
    
    field.parentNode.appendChild(errorElement);
  },
  
  /**
   * Clear validation error for field
   * @param {HTMLElement} field - Form field element
   */
  clearError(field) {
    field.classList.remove('error');
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  },
  
  /**
   * Validate entire form
   * @param {HTMLFormElement} form - Form to validate
   * @returns {boolean} Is form valid
   */
  validateForm(form) {
    let isValid = true;
    const fields = form.querySelectorAll('[required]');
    
    fields.forEach(field => {
      const value = field.value.trim();
      const fieldName = field.name || field.id;
      
      // Clear previous errors
      this.clearError(field);
      
      // Required validation
      if (!this.isRequired(value)) {
        this.showError(field, `${fieldName} es obligatorio`);
        isValid = false;
        return;
      }
      
      // Email validation
      if (field.type === 'email' && !this.isValidEmail(value)) {
        this.showError(field, 'Ingresa un email válido');
        isValid = false;
        return;
      }
      
      // Phone validation
      if (field.type === 'tel' && value && !this.isValidPhone(value)) {
        this.showError(field, 'Ingresa un teléfono válido');
        isValid = false;
        return;
      }
    });
    
    return isValid;
  }
};

// ================================================
// LOCAL STORAGE HELPERS
// ================================================
const StorageManager = {
  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Could not save to localStorage:', error);
    }
  },
  
  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Stored data or default value
   */
  load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Could not load from localStorage:', error);
      return defaultValue;
    }
  },
  
  /**
   * Remove data from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Could not remove from localStorage:', error);
    }
  }
};

// ================================================
// MOBILE NAVIGATION
// ================================================
function initMobileNavigation() {
  if (!DOM.navToggle || !DOM.navMenu) return;
  
  DOM.navToggle.addEventListener('click', () => {
    DOM.navToggle.classList.toggle('active');
    DOM.navMenu.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = DOM.navMenu.classList.contains('active') ? 'hidden' : '';
  });
  
  // Close menu when clicking on nav links
  DOM.navMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      DOM.navToggle.classList.remove('active');
      DOM.navMenu.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!DOM.navToggle.contains(e.target) && !DOM.navMenu.contains(e.target)) {
      DOM.navToggle.classList.remove('active');
      DOM.navMenu.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

// ================================================
// SMOOTH SCROLLING
// ================================================
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ================================================
// NAVBAR SCROLL EFFECT
// ================================================
function initNavbarScrollEffect() {
  if (!DOM.navbar) return;
  
  let lastScrollY = window.scrollY;
  const scrollThreshold = 10;
  
  const handleScroll = throttle(() => {
    const currentScrollY = window.scrollY;
    
    // Add/remove scrolled class based on scroll position
    if (currentScrollY > scrollThreshold) {
      DOM.navbar.classList.add('scrolled');
    } else {
      DOM.navbar.classList.remove('scrolled');
    }
    
    // Hide/show navbar on scroll direction change
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      DOM.navbar.style.transform = 'translateY(-100%)';
    } else {
      DOM.navbar.style.transform = 'translateY(0)';
    }
    
    lastScrollY = currentScrollY;
  }, 100);
  
  window.addEventListener('scroll', handleScroll);
}

// ================================================
// IMAGE LAZY LOADING
// ================================================
function initLazyLoading() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(img => {
      img.classList.add('lazy');
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    images.forEach(img => {
      img.src = img.dataset.src || img.src;
    });
  }
}

// ================================================
// FORM HANDLERS
// ================================================
function initFormHandlers() {
  // Newsletter form
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }
  
  // Contact form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
  
  // Real-time validation
  document.querySelectorAll('input, textarea, select').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.hasAttribute('required') && field.value.trim()) {
        FormValidator.clearError(field);
      }
    });
  });
}

/**
 * Handle newsletter form submission
 * @param {Event} e - Form submit event
 */
async function handleNewsletterSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const emailInput = form.querySelector('#newsletter-email');
  const email = emailInput.value.trim();
  
  if (!FormValidator.isValidEmail(email)) {
    ToastManager.error('Por favor, ingresa un email válido');
    return;
  }
  
  try {
    // Simulate API call
    await LoadingManager.withLoading(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // Success
    ToastManager.success('¡Te has suscrito exitosamente a nuestro newsletter!');
    form.reset();
    
    // Save to localStorage for demo purposes
    const subscribers = StorageManager.load('newsletter-subscribers', []);
    subscribers.push({ email, date: new Date().toISOString() });
    StorageManager.save('newsletter-subscribers', subscribers);
    
  } catch (error) {
    ToastManager.error('Error al suscribirse. Por favor, intenta nuevamente.');
    console.error('Newsletter subscription error:', error);
  }
}

/**
 * Handle contact form submission
 * @param {Event} e - Form submit event
 */
async function handleContactSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  
  if (!FormValidator.validateForm(form)) {
    ToastManager.error('Por favor, corrige los errores en el formulario');
    return;
  }
  
  try {
    // Simulate API call
    await LoadingManager.withLoading(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    });
    
    // Success
    ToastManager.success('¡Tu mensaje ha sido enviado exitosamente! Te responderemos pronto.');
    form.reset();
    
    // Save to localStorage for demo purposes
    const formData = new FormData(form);
    const contactData = Object.fromEntries(formData);
    contactData.date = new Date().toISOString();
    
    const messages = StorageManager.load('contact-messages', []);
    messages.push(contactData);
    StorageManager.save('contact-messages', messages);
    
  } catch (error) {
    ToastManager.error('Error al enviar el mensaje. Por favor, intenta nuevamente.');
    console.error('Contact form error:', error);
  }
}

// ================================================
// FAQ TOGGLE (for contact page)
// ================================================
function initFAQToggle() {
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.closest('.faq-item');
      const isActive = faqItem.classList.contains('active');
      
      // Close all FAQ items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Open clicked item if it wasn't active
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });
}

// ================================================
// INITIALIZATION
// ================================================
function init() {
  console.log('TICS Store - Initializing...');
  
  // Initialize core features
  initMobileNavigation();
  initSmoothScrolling();
  initNavbarScrollEffect();
  initLazyLoading();
  initFormHandlers();
  initFAQToggle();
  
  // Update cart count on page load
  if (typeof updateCartCount === 'function') {
    updateCartCount();
  }
  
  console.log('TICS Store - Initialized successfully!');
}

// ================================================
// DOM CONTENT LOADED
// ================================================
document.addEventListener('DOMContentLoaded', init);

// ================================================
// GLOBAL ERROR HANDLER
// ================================================
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  ToastManager.error('Ocurrió un error inesperado. Por favor, recarga la página.');
});

// ================================================
// EXPORT FOR OTHER MODULES
// ================================================
window.TICS = {
  CONFIG,
  formatCurrency,
  formatDate,
  debounce,
  throttle,
  generateId,
  sanitizeHTML,
  getQueryParam,
  setQueryParam,
  LoadingManager,
  ToastManager,
  FormValidator,
  StorageManager
};