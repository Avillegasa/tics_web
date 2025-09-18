/*
  TICS Store - Products Management
  
  This module handles:
  - Loading products from JSON
  - Product display and rendering
  - Product filtering and sorting
  - Product card generation
  - Related products
  
  CUSTOMIZATION:
  - Modify PRODUCTS_PER_PAGE for pagination
  - Adjust product card template in createProductCard()
  - Change sorting algorithms in sortProducts()
  - Modify filter logic in filterProducts()
*/

// ================================================
// CONFIGURATION
// ================================================
const PRODUCTS_CONFIG = {
  PRODUCTS_PER_PAGE: 8,
  FEATURED_COUNT: 4,
  RELATED_COUNT: 4,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  DEFAULT_SORT: 'featured'
};

// ================================================
// STATE MANAGEMENT
// ================================================
let productsData = [];
let filteredProducts = [];
let currentSort = PRODUCTS_CONFIG.DEFAULT_SORT;
let currentFilters = {
  category: 'all',
  priceMin: null,
  priceMax: null,
  rating: null,
  inStock: true,
  onSale: false
};

// ================================================
// PRODUCT DATA LOADING
// ================================================

/**
 * Load products from API with caching
 * @returns {Promise<Array>} Array of products
 */
async function loadProducts() {
  // Check cache first
  try {
    const cached = localStorage.getItem('products-cache');
    const cacheTime = localStorage.getItem('products-cache-time');

    if (cached && cacheTime && (Date.now() - parseInt(cacheTime) < PRODUCTS_CONFIG.CACHE_DURATION)) {
      productsData = JSON.parse(cached);
      // Export to global scope for search functionality
      window.productsData = productsData;
      console.log('Products loaded from cache:', productsData.length);
      return productsData;
    }
  } catch (e) {
    console.warn('Cache error:', e);
  }

  try {
    console.log('Loading products from API...');
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load products');
    }

    productsData = data.products;

    // Export to global scope for search functionality
    window.productsData = productsData;

    // Cache the products
    try {
      localStorage.setItem('products-cache', JSON.stringify(productsData));
      localStorage.setItem('products-cache-time', Date.now().toString());
    } catch (e) {
      console.warn('Could not cache products:', e);
    }

    console.log('Products loaded successfully:', productsData.length);
    return productsData;
  } catch (error) {
    console.error('Error loading products:', error);
    alert('Error al cargar los productos');
    return [];
  }
}

/**
 * Get product by ID
 * @param {number} productId - Product ID
 * @returns {Object|null} Product object or null
 */
function getProductById(productId) {
  return productsData.find(product => product.id === parseInt(productId));
}

/**
 * Get products by category
 * @param {string} category - Category name
 * @returns {Array} Array of products in category
 */
function getProductsByCategory(category) {
  if (category === 'all') return productsData;
  return productsData.filter(product => product.category === category);
}

/**
 * Get featured products
 * @returns {Promise<Array>} Array of featured products
 */
async function getFeaturedProducts() {
  try {
    console.log('Loading featured products from API...');
    const response = await fetch(`/api/products/featured?limit=${PRODUCTS_CONFIG.FEATURED_COUNT}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load featured products');
    }

    console.log('Featured products loaded successfully:', data.products.length);
    return data.products;
  } catch (error) {
    console.error('Error loading featured products:', error);
    // Fallback to local data if available
    if (productsData.length > 0) {
      const featured = productsData.filter(product => product.salePrice || product.sale_price || product.rating >= 4.5);
      return featured.slice(0, PRODUCTS_CONFIG.FEATURED_COUNT);
    }
    return [];
  }
}

/**
 * Get related products based on category and tags
 * @param {Object} currentProduct - Current product
 * @returns {Promise<Array>} Array of related products
 */
async function getRelatedProducts(currentProduct) {
  if (!currentProduct) return [];

  try {
    console.log('Loading related products from API...');
    const response = await fetch(`/api/products/${currentProduct.id}/related?limit=${PRODUCTS_CONFIG.RELATED_COUNT}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to load related products');
    }

    console.log('Related products loaded successfully:', data.products.length);
    return data.products;
  } catch (error) {
    console.error('Error loading related products:', error);
    // Fallback to local data if available
    if (productsData.length > 0) {
      const related = productsData.filter(product => {
        if (product.id === currentProduct.id) return false;

        // Same category or shared tags
        const sameCategory = product.category === currentProduct.category;
        const sharedTags = currentProduct.tags?.some(tag =>
          product.tags?.includes(tag)
        );

        return sameCategory || sharedTags;
      });

      return related.slice(0, PRODUCTS_CONFIG.RELATED_COUNT);
    }
    return [];
  }
}

// ================================================
// PRODUCT FILTERING
// ================================================

/**
 * Filter products based on current filters
 * @param {Array} products - Products to filter
 * @returns {Array} Filtered products
 */
function filterProducts(products) {
  return products.filter(product => {
    // Category filter
    if (currentFilters.category !== 'all' && product.category !== currentFilters.category) {
      return false;
    }
    
    // Price range filter
    const price = product.sale_price || product.price;
    if (currentFilters.priceMin && price < currentFilters.priceMin) {
      return false;
    }
    if (currentFilters.priceMax && price > currentFilters.priceMax) {
      return false;
    }
    
    // Rating filter
    if (currentFilters.rating) {
      if (currentFilters.rating === '4+' && product.rating < 4) {
        return false;
      }
      if (currentFilters.rating === '4.5+' && product.rating < 4.5) {
        return false;
      }
    }
    
    // Stock filter
    if (currentFilters.inStock && product.stock <= 0) {
      return false;
    }
    
    // Sale filter
    if (currentFilters.onSale && !product.sale_price) {
      return false;
    }
    
    return true;
  });
}

/**
 * Search products by query using API
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching products
 */
async function searchProductsAPI(query) {
  if (!query || query.trim() === '') {
    return await loadProducts();
  }

  try {
    console.log('Searching products via API:', query);
    const response = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to search products');
    }

    console.log('Search completed:', data.products.length, 'results');
    return data.products;
  } catch (error) {
    console.error('Error searching products:', error);
    // Fallback to local search if available
    if (productsData.length > 0) {
      return searchProducts(productsData, query);
    }
    return [];
  }
}

/**
 * Search products by query (local fallback)
 * @param {Array} products - Products to search
 * @param {string} query - Search query
 * @returns {Array} Matching products
 */
function searchProducts(products, query) {
  if (!query || query.trim() === '') return products;

  const searchTerm = query.toLowerCase().trim();

  return products.filter(product => {
    const searchableText = [
      product.title,
      product.description,
      product.category,
      ...(product.tags || [])
    ].join(' ').toLowerCase();

    return searchableText.includes(searchTerm);
  });
}

// ================================================
// PRODUCT SORTING
// ================================================

/**
 * Sort products based on criteria
 * @param {Array} products - Products to sort
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted products
 */
function sortProducts(products, sortBy) {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));

    case 'price-desc':
      return sorted.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
    
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    
    case 'newest':
      // For demo, sort by ID (assuming higher ID = newer)
      return sorted.sort((a, b) => b.id - a.id);
    
    case 'featured':
    default:
      // Featured products first (with sale_price), then by rating
      return sorted.sort((a, b) => {
        const aFeatured = a.sale_price ? 1 : 0;
        const bFeatured = b.sale_price ? 1 : 0;
        
        if (aFeatured !== bFeatured) {
          return bFeatured - aFeatured;
        }
        
        return b.rating - a.rating;
      });
  }
}

// ================================================
// PRODUCT CARD RENDERING
// ================================================

/**
 * Create HTML for a single product card
 * @param {Object} product - Product data
 * @param {boolean} showAddToCart - Whether to show add to cart button
 * @returns {string} HTML string
 */
function createProductCard(product, showAddToCart = true) {
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  const currentPrice = product.sale_price || product.price;
  const isOutOfStock = product.stock <= 0;
  
  // Generate star rating
  const fullStars = Math.floor(product.rating);
  const hasHalfStar = product.rating % 1 >= 0.5;
  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '⭐';
  
  return `
    <div class="product-card" data-product-id="${product.id}">
      <div class="product-image">
        <img src="${product.images[0]}" alt="${TICS.sanitizeHTML(product.title)}" loading="lazy">
        ${hasDiscount ? `<div class="product-badge sale">-${discountPercentage}%</div>` : ''}
        ${isOutOfStock ? '<div class="product-badge out-of-stock">Agotado</div>' : ''}
      </div>
      
      <div class="product-info">
        <div class="product-category">${TICS.sanitizeHTML(product.category)}</div>
        
        <h3 class="product-title">
          <a href="product.html?id=${product.id}">
            ${TICS.sanitizeHTML(product.title)}
          </a>
        </h3>
        
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">(${product.rating})</span>
        </div>
        
        <div class="product-price">
          <span class="current-price">${TICS.formatCurrency(currentPrice)}</span>
          ${hasDiscount ? `<span class="original-price">${TICS.formatCurrency(product.price)}</span>` : ''}
        </div>
        
        ${showAddToCart ? `
          <div class="product-actions">
            <button class="btn btn-primary add-to-cart-btn" 
                    data-product-id="${product.id}"
                    ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'Agotado' : 'Agregar al Carrito'}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render products grid
 * @param {Array} products - Products to render
 * @param {HTMLElement} container - Container element
 * @param {boolean} showAddToCart - Whether to show add to cart buttons
 */
function renderProductsGrid(products, container, showAddToCart = true) {
  if (!container) return;
  
  if (products.length === 0) {
    container.innerHTML = `
      <div class="no-products">
        <h3>No se encontraron productos</h3>
        <p>Intenta ajustar tus filtros de búsqueda</p>
      </div>
    `;
    return;
  }
  
  const productsHTML = products.map(product => 
    createProductCard(product, showAddToCart)
  ).join('');
  
  container.innerHTML = productsHTML;
  
  // Add event listeners for add to cart buttons
  if (showAddToCart && typeof addToCart === 'function') {
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const productId = parseInt(btn.dataset.productId);
        const product = getProductById(productId);
        
        if (product) {
          addToCart(product, 1);
        }
      });
    });
  }
  
  // Add click handlers for product links
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking on button or link
      if (e.target.closest('.btn') || e.target.closest('a')) {
        return;
      }
      
      const productId = card.dataset.productId;
      window.location.href = `product.html?id=${productId}`;
    });
  });
}

// ================================================
// CATEGORIES MANAGEMENT
// ================================================

/**
 * Get all unique categories from products
 * @returns {Array} Array of category names
 */
function getAllCategories() {
  const categories = new Set(['all']);
  productsData.forEach(product => {
    if (product.category) {
      categories.add(product.category);
    }
  });
  return Array.from(categories);
}

/**
 * Render category filters
 * @param {HTMLElement} container - Container for category filters
 */
function renderCategoryFilters(container) {
  if (!container) return;
  
  const categories = getAllCategories();
  
  const filtersHTML = categories.map(category => `
    <label class="filter-checkbox">
      <input type="checkbox" value="${category}" ${category === 'all' ? 'checked' : ''}>
      <span class="checkmark"></span>
      ${category === 'all' ? 'Todas las categorías' : TICS.sanitizeHTML(category)}
    </label>
  `).join('');
  
  container.innerHTML = filtersHTML;
  
  // Add event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.value === 'all') {
        // Uncheck all other categories
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (cb.value !== 'all') cb.checked = false;
        });
      } else {
        // Uncheck "all" when selecting specific category
        const allCheckbox = container.querySelector('input[value="all"]');
        if (allCheckbox) allCheckbox.checked = false;
      }
      
      // Update filters and refresh display
      updateCategoryFilter();
    });
  });
}

/**
 * Update category filter based on selected checkboxes
 */
function updateCategoryFilter() {
  const categoryContainer = document.getElementById('category-filters');
  if (!categoryContainer) return;
  
  const checkedCategories = Array.from(
    categoryContainer.querySelectorAll('input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  
  if (checkedCategories.includes('all') || checkedCategories.length === 0) {
    currentFilters.category = 'all';
  } else {
    currentFilters.category = checkedCategories[0]; // For now, support single category
  }
  
  applyFiltersAndSort();
}

// ================================================
// MAIN FILTER AND SORT APPLICATION
// ================================================

/**
 * Apply current filters and sorting to products
 */
function applyFiltersAndSort() {
  // Start with all products
  let filtered = filterProducts(productsData);
  
  // Apply sorting
  filtered = sortProducts(filtered, currentSort);
  
  // Update filtered products
  filteredProducts = filtered;
  
  // Update display
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid) {
    renderProductsGrid(filtered, productsGrid);
  }
  
  // Update results count
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    resultsCount.textContent = `Mostrando ${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
  }
}

/**
 * Update sort order
 * @param {string} sortBy - New sort criteria
 */
function updateSort(sortBy) {
  currentSort = sortBy;
  applyFiltersAndSort();
}

/**
 * Update price range filter
 * @param {number|null} minPrice - Minimum price
 * @param {number|null} maxPrice - Maximum price
 */
function updatePriceFilter(minPrice, maxPrice) {
  currentFilters.priceMin = minPrice;
  currentFilters.priceMax = maxPrice;
  applyFiltersAndSort();
}

/**
 * Update rating filter
 * @param {string|null} rating - Rating filter value
 */
function updateRatingFilter(rating) {
  currentFilters.rating = rating;
  applyFiltersAndSort();
}

/**
 * Clear all filters
 */
function clearAllFilters() {
  currentFilters = {
    category: 'all',
    priceMin: null,
    priceMax: null,
    rating: null,
    inStock: true,
    onSale: false
  };
  
  // Reset form elements
  const categoryContainer = document.getElementById('category-filters');
  if (categoryContainer) {
    categoryContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = cb.value === 'all';
    });
  }
  
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  if (priceMin) priceMin.value = '';
  if (priceMax) priceMax.value = '';
  
  const ratingInputs = document.querySelectorAll('input[name="rating"]');
  ratingInputs.forEach(input => {
    input.checked = input.value === 'all';
  });
  
  applyFiltersAndSort();
}

// ================================================
// INITIALIZATION
// ================================================

/**
 * Initialize products module
 */
async function initProducts() {
  try {
    await loadProducts();
    
    // Initialize featured products on home page
    const featuredContainer = document.getElementById('featured-products');
    if (featuredContainer) {
      const featured = await getFeaturedProducts();
      renderProductsGrid(featured, featuredContainer);
    }
    
    // Initialize shop page if elements exist
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
      // Render category filters
      const categoryFilters = document.getElementById('category-filters');
      if (categoryFilters) {
        renderCategoryFilters(categoryFilters);
      }
      
      // Initial render
      applyFiltersAndSort();
      
      // Add sort event listener
      const sortSelect = document.getElementById('sort-select');
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          updateSort(e.target.value);
        });
      }
      
      // Add price filter event listeners
      const priceMin = document.getElementById('price-min');
      const priceMax = document.getElementById('price-max');
      const applyPriceBtn = document.getElementById('apply-price');
      
      if (applyPriceBtn) {
        applyPriceBtn.addEventListener('click', () => {
          const min = priceMin?.value ? parseFloat(priceMin.value) : null;
          const max = priceMax?.value ? parseFloat(priceMax.value) : null;
          updatePriceFilter(min, max);
        });
      }
      
      // Add rating filter event listeners
      document.querySelectorAll('input[name="rating"]').forEach(input => {
        input.addEventListener('change', (e) => {
          updateRatingFilter(e.target.value === 'all' ? null : e.target.value);
        });
      });
      
      // Add clear filters event listener
      const clearFiltersBtn = document.getElementById('clear-filters');
      if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
      }
    }
    
  } catch (error) {
    console.error('Error initializing products:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initProducts);

// Export functions for other modules
window.ProductsManager = {
  loadProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  getRelatedProducts,
  renderProductsGrid,
  searchProducts,
  searchProductsAPI,
  updateSort,
  updatePriceFilter,
  clearAllFilters,
  applyFiltersAndSort
};