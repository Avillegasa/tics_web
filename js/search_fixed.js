/*
  TICS Store - Search Functionality (Fixed Version)

  This module handles:
  - Real-time search with autocompletion
  - Search suggestions
  - Search result highlighting
*/

// ================================================
// CONFIGURATION
// ================================================
const SEARCH_CONFIG = {
  MAX_SUGGESTIONS: 5,
  SEARCH_DELAY: 300,
  MIN_SEARCH_LENGTH: 2
};

// ================================================
// STATE MANAGEMENT
// ================================================
let productsData = [];
let currentSearchTerm = '';

// ================================================
// DOM ELEMENTS
// ================================================
let searchElements = {};

// ================================================
// UTILITY FUNCTIONS
// ================================================

// Simple debounce function
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

// Simple HTML sanitization
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ================================================
// SEARCH FUNCTIONALITY
// ================================================

/**
 * Perform product search
 * @param {string} query - Search query
 * @returns {Array} Matching products
 */
function searchProducts(query) {
  if (!query || query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    return [];
  }

  // Use global productsData if available, otherwise try to get from window
  const products = productsData.length > 0 ? productsData : (window.productsData || []);

  if (products.length === 0) {
    console.warn('No products available for search');
    return [];
  }

  const searchTerm = query.toLowerCase().trim();
  const searchWords = searchTerm.split(/\s+/);

  return products.filter(product => {
    // Create searchable text from product properties
    const searchableText = [
      product.title,
      product.description,
      product.category,
      product.sku,
      ...(product.tags || [])
    ].join(' ').toLowerCase();

    // Check if all search words are found
    return searchWords.every(word =>
      searchableText.includes(word)
    );
  }).slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS);
}

/**
 * Generate search suggestions
 * @param {string} query - Search query
 * @returns {Array} Array of suggestions
 */
function generateSearchSuggestions(query) {
  if (!query || query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    return [];
  }

  const searchResults = searchProducts(query);
  const suggestions = [];

  // Add product suggestions
  searchResults.forEach(product => {
    suggestions.push({
      type: 'product',
      text: product.title,
      category: product.category,
      productId: product.id,
      price: product.price,
      icon: '📱'
    });
  });

  return suggestions;
}

// ================================================
// SEARCH UI MANAGEMENT
// ================================================

/**
 * Show search suggestions
 * @param {Array} suggestions - Array of suggestions
 */
function showSearchSuggestions(suggestions) {
  if (!searchElements.suggestions) return;

  if (suggestions.length === 0) {
    hideSearchSuggestions();
    return;
  }

  const suggestionsHTML = suggestions.map(suggestion => `
    <div class="search-suggestion"
         data-type="${suggestion.type}"
         data-text="${sanitizeHTML(suggestion.text)}"
         data-product-id="${suggestion.productId || ''}"
         data-category="${suggestion.category || ''}">
      <span class="suggestion-icon">${suggestion.icon}</span>
      <div class="suggestion-content">
        <span class="suggestion-text">${sanitizeHTML(suggestion.text)}</span>
        <span class="suggestion-category">${sanitizeHTML(suggestion.category)} • €${suggestion.price}</span>
      </div>
    </div>
  `).join('');

  searchElements.suggestions.innerHTML = suggestionsHTML;
  searchElements.suggestions.style.display = 'block';

  // Add click event listeners
  attachSuggestionEventListeners();
}

/**
 * Hide search suggestions
 */
function hideSearchSuggestions() {
  if (!searchElements.suggestions) return;
  searchElements.suggestions.style.display = 'none';
}

/**
 * Attach event listeners to suggestions
 */
function attachSuggestionEventListeners() {
  if (!searchElements.suggestions) return;

  searchElements.suggestions.querySelectorAll('.search-suggestion').forEach(suggestion => {
    suggestion.addEventListener('click', (e) => {
      e.preventDefault();
      handleSuggestionClick(suggestion);
    });
  });
}

/**
 * Handle suggestion click
 * @param {HTMLElement} suggestion - Clicked suggestion element
 */
function handleSuggestionClick(suggestion) {
  const type = suggestion.dataset.type;
  const text = suggestion.dataset.text;
  const productId = suggestion.dataset.productId;

  hideSearchSuggestions();

  if (type === 'product' && productId) {
    // Navigate to product page
    window.location.href = `product.html?id=${productId}`;
  } else {
    // Perform search
    performSearch(text);
  }
}

// ================================================
// SEARCH EXECUTION
// ================================================

/**
 * Perform search and navigate to results
 * @param {string} query - Search query
 */
function performSearch(query) {
  const searchQuery = query.trim();

  if (!searchQuery || searchQuery.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    alert(`Ingresa al menos ${SEARCH_CONFIG.MIN_SEARCH_LENGTH} caracteres para buscar`);
    return;
  }

  // Clear search input
  if (searchElements.input) {
    searchElements.input.value = '';
  }

  // Navigate to shop page with search query
  const searchUrl = `shop.html?search=${encodeURIComponent(searchQuery)}`;
  window.location.href = searchUrl;
}

// ================================================
// SEARCH INPUT HANDLERS
// ================================================

/**
 * Handle search input changes
 * @param {Event} e - Input event
 */
const handleSearchInput = debounce((e) => {
  const query = e.target.value.trim();
  currentSearchTerm = query;

  console.log('Search input changed:', query);

  if (query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    hideSearchSuggestions();
    return;
  }

  // Generate and show suggestions
  const suggestions = generateSearchSuggestions(query);
  console.log('Generated suggestions:', suggestions.length);
  showSearchSuggestions(suggestions);
}, SEARCH_CONFIG.SEARCH_DELAY);

/**
 * Handle search form submission
 * @param {Event} e - Form submit event
 */
function handleSearchSubmit(e) {
  e.preventDefault();

  if (!searchElements.input) return;

  const query = searchElements.input.value.trim();
  performSearch(query);
}

/**
 * Handle keyboard navigation
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (searchElements.input && searchElements.input.value.trim()) {
      performSearch(searchElements.input.value.trim());
    }
  } else if (e.key === 'Escape') {
    hideSearchSuggestions();
    if (searchElements.input) {
      searchElements.input.blur();
    }
  }
}

// ================================================
// INITIALIZATION
// ================================================

/**
 * Load products data
 */
async function loadProductsForSearch() {
  try {
    console.log('Loading products for search...');
    const response = await fetch('data/products.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    productsData = await response.json();
    window.productsData = productsData; // Export to global scope
    console.log('Products loaded for search:', productsData.length);
    return productsData;
  } catch (error) {
    console.error('Error loading products for search:', error);
    return [];
  }
}

/**
 * Initialize search functionality
 */
function initSearch() {
  console.log('Initializing search...');

  // Get DOM elements
  searchElements = {
    input: document.getElementById('search-input'),
    button: document.getElementById('search-btn'),
    suggestions: document.getElementById('search-suggestions')
  };

  if (!searchElements.input) {
    console.warn('Search input element not found');
    return;
  }

  console.log('Search elements found:', {
    input: !!searchElements.input,
    button: !!searchElements.button,
    suggestions: !!searchElements.suggestions
  });

  // Search input events
  searchElements.input.addEventListener('input', handleSearchInput);
  searchElements.input.addEventListener('keydown', handleKeyDown);

  // Search button click
  if (searchElements.button) {
    searchElements.button.addEventListener('click', (e) => {
      e.preventDefault();
      performSearch(searchElements.input.value.trim());
    });
  }

  // Search form submission (if wrapped in form)
  const searchForm = searchElements.input.closest('form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearchSubmit);
  }

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search') && !e.target.closest('.search-suggestions')) {
      hideSearchSuggestions();
    }
  });

  console.log('Search initialization complete');
}

/**
 * Initialize everything
 */
async function initializeSearchSystem() {
  console.log('Initializing search system...');

  // Initialize UI
  initSearch();

  // Load products if not already loaded
  if (!window.productsData || window.productsData.length === 0) {
    await loadProductsForSearch();
  } else {
    productsData = window.productsData;
    console.log('Using existing products data:', productsData.length);
  }

  console.log('Search system ready!');
}

// ================================================
// AUTO-INITIALIZATION
// ================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing search system...');
  initializeSearchSystem();
});

// Also try after a delay to catch late-loading products
setTimeout(() => {
  if (!window.SearchManager) {
    console.log('Secondary search initialization...');
    initializeSearchSystem();
  }
}, 2000);

// Export for other modules
window.SearchManager = {
  searchProducts,
  performSearch,
  generateSearchSuggestions
};