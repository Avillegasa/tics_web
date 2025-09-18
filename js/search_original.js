/*
  TICS Store - Search Functionality
  
  This module handles:
  - Real-time search with autocompletion
  - Search suggestions
  - Search history
  - Search result highlighting
  - Mobile search functionality
  
  CUSTOMIZATION:
  - Modify MAX_SUGGESTIONS for suggestion count
  - Adjust SEARCH_DELAY for debounce timing
  - Change suggestion ranking algorithm
  - Customize search result display
*/

// ================================================
// CONFIGURATION
// ================================================
const SEARCH_CONFIG = {
  MAX_SUGGESTIONS: 5,
  SEARCH_DELAY: 300, // Debounce delay in milliseconds
  MIN_SEARCH_LENGTH: 2,
  MAX_SEARCH_HISTORY: 10,
  STORAGE_KEY: 'tics_search_history'
};

// ================================================
// STATE MANAGEMENT
// ================================================
let searchHistory = [];
let currentSearchTerm = '';
let searchSuggestionsVisible = false;

// ================================================
// DOM ELEMENTS
// ================================================
const searchElements = {
  input: document.getElementById('search-input'),
  button: document.getElementById('search-btn'),
  suggestions: document.getElementById('search-suggestions')
};

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

  // Get products from ProductsManager if available
  const products = window.productsData || [];

  console.log('Search debug:', {
    query: query,
    productsAvailable: products.length,
    productsData: window.productsData ? 'exists' : 'missing',
    ProductsManager: window.ProductsManager ? 'exists' : 'missing'
  });

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
  }).map(product => ({
    ...product,
    relevanceScore: calculateRelevanceScore(product, searchWords)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Calculate relevance score for search results
 * @param {Object} product - Product object
 * @param {Array} searchWords - Array of search words
 * @returns {number} Relevance score
 */
function calculateRelevanceScore(product, searchWords) {
  let score = 0;
  const title = product.title.toLowerCase();
  const description = product.description.toLowerCase();
  const category = product.category.toLowerCase();
  
  searchWords.forEach(word => {
    // Title matches get highest score
    if (title.includes(word)) {
      score += title.startsWith(word) ? 10 : 5;
    }
    
    // Category matches get medium score
    if (category.includes(word)) {
      score += 3;
    }
    
    // Description matches get lower score
    if (description.includes(word)) {
      score += 1;
    }
    
    // Exact matches get bonus
    if (title === word || category === word) {
      score += 15;
    }
  });
  
  // Boost popular products (high rating)
  score += product.rating || 0;
  
  // Boost products with sales
  if (product.salePrice && product.salePrice < product.price) {
    score += 2;
  }
  
  return score;
}

/**
 * Generate search suggestions
 * @param {string} query - Search query
 * @returns {Array} Array of suggestions
 */
function generateSearchSuggestions(query) {
  if (!query || query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    return getRecentSearches();
  }
  
  const searchResults = searchProducts(query);
  const suggestions = [];
  
  // Add product title suggestions
  searchResults.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS).forEach(product => {
    suggestions.push({
      type: 'product',
      text: product.title,
      category: product.category,
      image: product.images[0],
      productId: product.id,
      icon: '🔍'
    });
  });
  
  // Add category suggestions
  const categories = [...new Set(searchResults.map(p => p.category))]
    .slice(0, 2);
  
  categories.forEach(category => {
    if (!suggestions.some(s => s.text.toLowerCase() === category.toLowerCase())) {
      suggestions.push({
        type: 'category',
        text: `Buscar en ${category}`,
        category: category,
        icon: '📂'
      });
    }
  });
  
  // Limit total suggestions
  return suggestions.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS);
}

/**
 * Get recent search history
 * @returns {Array} Recent searches
 */
function getRecentSearches() {
  return searchHistory.slice(0, 5).map(search => ({
    type: 'history',
    text: search,
    icon: '🕐'
  }));
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
  
  const suggestionsHTML = suggestions.map(suggestion => 
    createSuggestionHTML(suggestion)
  ).join('');
  
  searchElements.suggestions.innerHTML = suggestionsHTML;
  searchElements.suggestions.style.display = 'block';
  searchSuggestionsVisible = true;
  
  // Add click event listeners
  attachSuggestionEventListeners();
}

// Simple HTML sanitization
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Create HTML for a single suggestion
 * @param {Object} suggestion - Suggestion object
 * @returns {string} HTML string
 */
function createSuggestionHTML(suggestion) {
  let additionalInfo = '';

  if (suggestion.type === 'product') {
    additionalInfo = `
      <div class="suggestion-details">
        <img src="${suggestion.image}" alt="${sanitizeHTML(suggestion.text)}" loading="lazy">
        <span class="suggestion-category">${sanitizeHTML(suggestion.category)}</span>
      </div>
    `;
  }

  return `
    <div class="search-suggestion"
         data-type="${suggestion.type}"
         data-text="${sanitizeHTML(suggestion.text)}"
         data-product-id="${suggestion.productId || ''}"
         data-category="${suggestion.category || ''}">
      <span class="suggestion-icon">${suggestion.icon}</span>
      <div class="suggestion-content">
        <span class="suggestion-text">${highlightSearchTerm(suggestion.text, currentSearchTerm)}</span>
        ${additionalInfo}
      </div>
    </div>
  `;
}

/**
 * Highlight search term in text
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Search term to highlight
 * @returns {string} Text with highlighted terms
 */
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm || searchTerm.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    return sanitizeHTML(text);
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'gi');
  return sanitizeHTML(text).replace(regex, '<strong>$1</strong>');
}

/**
 * Hide search suggestions
 */
function hideSearchSuggestions() {
  if (!searchElements.suggestions) return;
  
  searchElements.suggestions.style.display = 'none';
  searchSuggestionsVisible = false;
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
    
    suggestion.addEventListener('mouseenter', () => {
      // Remove active class from other suggestions
      searchElements.suggestions.querySelectorAll('.search-suggestion').forEach(s => {
        s.classList.remove('active');
      });
      suggestion.classList.add('active');
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
  const category = suggestion.dataset.category;
  
  hideSearchSuggestions();
  
  if (type === 'product' && productId) {
    // Navigate to product page
    window.location.href = `product.html?id=${productId}`;
  } else if (type === 'category' && category) {
    // Navigate to shop with category filter
    window.location.href = `shop.html?category=${encodeURIComponent(category)}`;
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

  // Add to search history
  addToSearchHistory(searchQuery);

  // Clear search input
  if (searchElements.input) {
    searchElements.input.value = '';
  }

  // Navigate to shop page with search query
  const searchUrl = `shop.html?search=${encodeURIComponent(searchQuery)}`;
  window.location.href = searchUrl;
}

/**
 * Add search term to history
 * @param {string} searchTerm - Search term to add
 */
function addToSearchHistory(searchTerm) {
  // Remove if already exists
  searchHistory = searchHistory.filter(term => 
    term.toLowerCase() !== searchTerm.toLowerCase()
  );
  
  // Add to beginning
  searchHistory.unshift(searchTerm);
  
  // Limit history size
  searchHistory = searchHistory.slice(0, SEARCH_CONFIG.MAX_SEARCH_HISTORY);
  
  // Save to localStorage
  try {
    localStorage.setItem(SEARCH_CONFIG.STORAGE_KEY, JSON.stringify(searchHistory));
  } catch (e) {
    console.warn('Could not save search history to localStorage:', e);
  }
}

/**
 * Load search history from localStorage
 */
function loadSearchHistory() {
  try {
    const saved = localStorage.getItem(SEARCH_CONFIG.STORAGE_KEY);
    searchHistory = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Could not load search history from localStorage:', e);
    searchHistory = [];
  }
}

// ================================================
// KEYBOARD NAVIGATION
// ================================================

/**
 * Handle keyboard navigation in suggestions
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleSuggestionsKeyboard(e) {
  if (!searchSuggestionsVisible) return;
  
  const suggestions = searchElements.suggestions.querySelectorAll('.search-suggestion');
  const currentActive = searchElements.suggestions.querySelector('.search-suggestion.active');
  let activeIndex = currentActive ? Array.from(suggestions).indexOf(currentActive) : -1;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      activeIndex = (activeIndex + 1) % suggestions.length;
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
      break;
      
    case 'Enter':
      e.preventDefault();
      if (currentActive) {
        handleSuggestionClick(currentActive);
      } else if (searchElements.input.value.trim()) {
        performSearch(searchElements.input.value.trim());
      }
      return;
      
    case 'Escape':
      hideSearchSuggestions();
      searchElements.input.blur();
      return;
      
    default:
      return;
  }
  
  // Update active suggestion
  suggestions.forEach(s => s.classList.remove('active'));
  if (suggestions[activeIndex]) {
    suggestions[activeIndex].classList.add('active');
  }
}

// ================================================
// SEARCH INPUT HANDLERS
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

/**
 * Handle search input changes
 * @param {Event} e - Input event
 */
const handleSearchInput = debounce((e) => {
  const query = e.target.value.trim();
  currentSearchTerm = query;

  console.log('Search input changed:', query);

  if (query.length === 0) {
    // Show recent searches when input is empty but focused
    const recentSearches = getRecentSearches();
    if (recentSearches.length > 0) {
      showSearchSuggestions(recentSearches);
    } else {
      hideSearchSuggestions();
    }
    return;
  }

  if (query.length < SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
    hideSearchSuggestions();
    return;
  }

  // Generate and show suggestions
  console.log('Generating suggestions for:', query);
  const suggestions = generateSearchSuggestions(query);
  console.log('Generated suggestions:', suggestions);
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

// ================================================
// SHOP PAGE SEARCH INTEGRATION
// ================================================

/**
 * Initialize search on shop page
 */
// Simple URL parameter getter
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function initShopPageSearch() {
  // Check if we're on shop page with search query
  const searchQuery = getQueryParam('search');
  
  if (searchQuery && window.ProductsManager) {
    // Update page title
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
      pageTitle.textContent = `Resultados para "${searchQuery}"`;
    }
    
    // Filter products based on search
    const searchResults = searchProducts(searchQuery);
    
    // Update products display
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid && window.ProductsManager.renderProductsGrid) {
      window.ProductsManager.renderProductsGrid(searchResults, productsGrid);
    }
    
    // Update results count
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
      resultsCount.textContent = `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${searchQuery}"`;
    }
    
    // Add to search history
    addToSearchHistory(searchQuery);
  }
}

// ================================================
// EVENT LISTENERS
// ================================================

/**
 * Initialize search functionality
 */
function initSearch() {
  console.log('Initializing search...');

  // Load search history
  loadSearchHistory();

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
  searchElements.input.addEventListener('keydown', handleSuggestionsKeyboard);
  
  searchElements.input.addEventListener('focus', () => {
    // Show recent searches or suggestions when focused
    const currentValue = searchElements.input.value.trim();
    
    if (currentValue.length >= SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
      const suggestions = generateSearchSuggestions(currentValue);
      showSearchSuggestions(suggestions);
    } else if (searchHistory.length > 0) {
      const recentSearches = getRecentSearches();
      showSearchSuggestions(recentSearches);
    }
  });
  
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
  
  // Initialize shop page search if applicable
  if (window.location.pathname.includes('shop.html')) {
    // Wait for products to load
    setTimeout(initShopPageSearch, 500);
  }
}

// ================================================
// MOBILE SEARCH
// ================================================

/**
 * Initialize mobile search functionality
 */
function initMobileSearch() {
  // Create mobile search overlay if needed
  const mobileSearchTrigger = document.querySelector('.mobile-search-trigger');
  
  if (mobileSearchTrigger) {
    mobileSearchTrigger.addEventListener('click', () => {
      showMobileSearchOverlay();
    });
  }
}

/**
 * Show mobile search overlay
 */
function showMobileSearchOverlay() {
  // Create mobile search overlay
  const overlay = document.createElement('div');
  overlay.className = 'mobile-search-overlay';
  overlay.innerHTML = `
    <div class="mobile-search-header">
      <div class="mobile-search-container">
        <input type="text" placeholder="Buscar productos..." class="mobile-search-input" autocomplete="off">
        <button class="mobile-search-close">✕</button>
      </div>
    </div>
    <div class="mobile-search-suggestions"></div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add event listeners
  const mobileInput = overlay.querySelector('.mobile-search-input');
  const closeBtn = overlay.querySelector('.mobile-search-close');
  const mobileSuggestions = overlay.querySelector('.mobile-search-suggestions');
  
  // Focus input
  mobileInput.focus();
  
  // Handle input
  mobileInput.addEventListener('input', debounce((e) => {
    const suggestions = generateSearchSuggestions(e.target.value);
    showMobileSuggestions(mobileSuggestions, suggestions);
  }, SEARCH_CONFIG.SEARCH_DELAY));
  
  // Handle close
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
  
  // Handle overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

/**
 * Show mobile suggestions
 * @param {HTMLElement} container - Suggestions container
 * @param {Array} suggestions - Suggestions array
 */
function showMobileSuggestions(container, suggestions) {
  if (!container || suggestions.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  const suggestionsHTML = suggestions.map(suggestion =>
    createSuggestionHTML(suggestion)
  ).join('');
  
  container.innerHTML = suggestionsHTML;
  
  // Add click handlers
  container.querySelectorAll('.search-suggestion').forEach(suggestion => {
    suggestion.addEventListener('click', (e) => {
      e.preventDefault();
      handleSuggestionClick(suggestion);
      
      // Close mobile overlay
      const overlay = container.closest('.mobile-search-overlay');
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  });
}

// ================================================
// INITIALIZATION
// ================================================

// Initialize search functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing search...');
  initSearch();
  initMobileSearch();

  // Also try to initialize after a delay to ensure products are loaded
  setTimeout(() => {
    console.log('Secondary search initialization...');
    if (!window.productsData || window.productsData.length === 0) {
      console.log('Products not ready, trying to load...');
      if (window.ProductsManager && window.ProductsManager.loadProducts) {
        window.ProductsManager.loadProducts().then(() => {
          console.log('Products loaded for search');
        });
      }
    } else {
      console.log('Products already available:', window.productsData.length);
    }
  }, 2000);
});

// Export for other modules
window.SearchManager = {
  searchProducts,
  performSearch,
  generateSearchSuggestions,
  addToSearchHistory,
  getRecentSearches: () => [...searchHistory]
};