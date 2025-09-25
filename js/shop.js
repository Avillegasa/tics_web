/*
  TICS Store - Shop Page Specific Functionality
  
  This module handles:
  - Shop page initialization
  - Filter sidebar management
  - View toggle (grid/list)
  - Mobile filter management
  - URL parameter handling
*/

// ================================================
// SHOP PAGE STATE
// ================================================
let currentView = 'grid';

// ================================================
// FILTER SIDEBAR MANAGEMENT
// ================================================

/**
 * Initialize filter sidebar
 */
function initFilterSidebar() {
  const filterToggle = document.getElementById('filter-toggle');
  const sidebar = document.getElementById('shop-sidebar');
  
  if (!filterToggle || !sidebar) return;
  
  // Toggle sidebar on mobile
  filterToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    
    // Create overlay for mobile
    if (sidebar.classList.contains('active')) {
      createFilterOverlay();
    }
  });
}

/**
 * Create filter overlay for mobile
 */
function createFilterOverlay() {
  // Remove existing overlay if any
  const existingOverlay = document.querySelector('.filter-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'filter-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: block;
  `;
  
  document.body.appendChild(overlay);
  
  // Close sidebar when clicking overlay
  overlay.addEventListener('click', () => {
    closeMobileFilters();
  });
}

/**
 * Close mobile filters
 */
function closeMobileFilters() {
  const sidebar = document.getElementById('shop-sidebar');
  const overlay = document.querySelector('.filter-overlay');
  
  if (sidebar) {
    sidebar.classList.remove('active');
  }
  
  if (overlay) {
    overlay.remove();
  }
}

// ================================================
// VIEW TOGGLE MANAGEMENT
// ================================================

/**
 * Initialize view toggle functionality
 */
function initViewToggle() {
  const viewButtons = document.querySelectorAll('.view-btn');
  const productsGrid = document.getElementById('products-grid');
  
  if (!viewButtons.length || !productsGrid) return;
  
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view, viewButtons, productsGrid);
    });
  });
}

/**
 * Switch between grid and list view
 * @param {string} view - View type ('grid' or 'list')
 * @param {NodeList} buttons - View toggle buttons
 * @param {HTMLElement} grid - Products grid element
 */
function switchView(view, buttons, grid) {
  if (view === currentView) return;
  
  currentView = view;
  
  // Update button states
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  // Update grid classes
  grid.classList.toggle('list-view', view === 'list');
  
  // Save preference
  TICS.StorageManager.save('preferred-view', view);
  
  // Animate transition
  grid.style.opacity = '0.7';
  setTimeout(() => {
    grid.style.opacity = '1';
  }, 150);
}

/**
 * Load saved view preference
 */
function loadViewPreference() {
  const savedView = TICS.StorageManager.load('preferred-view', 'grid');
  const viewButtons = document.querySelectorAll('.view-btn');
  const productsGrid = document.getElementById('products-grid');
  
  if (savedView !== 'grid') {
    switchView(savedView, viewButtons, productsGrid);
  }
}

// ================================================
// URL PARAMETER HANDLING
// ================================================

/**
 * Initialize URL parameter handling
 */
function initURLParameters() {
  // Handle category parameter
  const categoryParam = TICS.getQueryParam('category');
  if (categoryParam) {
    handleCategoryParameter(categoryParam);
  }
  
  // Handle search parameter
  const searchParam = TICS.getQueryParam('search');
  if (searchParam) {
    handleSearchParameter(searchParam);
  }
}

/**
 * Handle category URL parameter
 * @param {string} category - Category name from URL
 */
function handleCategoryParameter(category) {
  // Update page title
  const pageTitle = document.querySelector('.page-title');
  if (pageTitle) {
    pageTitle.textContent = `${decodeURIComponent(category)} - TICS Store`;
  }
  
  // Update breadcrumb if exists
  const breadcrumb = document.querySelector('.breadcrumb-list .current');
  if (breadcrumb) {
    breadcrumb.textContent = decodeURIComponent(category);
  }
  
  // Select category filter
  setTimeout(() => {
    selectCategoryFilter(category);
  }, 100);
}

/**
 * Select category filter in sidebar
 * @param {string} category - Category to select
 */
function selectCategoryFilter(category) {
  const categoryFilters = document.getElementById('category-filters');
  if (!categoryFilters) return;
  
  const checkboxes = categoryFilters.querySelectorAll('input[type="checkbox"]');
  
  checkboxes.forEach(checkbox => {
    if (checkbox.value === category || 
        (checkbox.value === 'all' && category === 'all')) {
      checkbox.checked = true;
    } else {
      checkbox.checked = false;
    }
  });
  
  // Update filters
  if (window.ProductsManager && window.ProductsManager.applyFiltersAndSort) {
    window.ProductsManager.applyFiltersAndSort();
  }
}

/**
 * Handle search URL parameter
 * @param {string} searchTerm - Search term from URL
 */
async function handleSearchParameter(searchTerm) {
  const decodedTerm = decodeURIComponent(searchTerm);

  try {
    console.log('Performing search for:', decodedTerm);

    // Update page title immediately
    updatePageTitleForSearch(decodedTerm);

    // Update search input if it exists
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = decodedTerm;
    }

    // Wait for ProductsManager to be available
    await waitForProductsManager();

    // Perform search
    const searchResults = await window.searchProductsAPI(decodedTerm);

    console.log('Search results:', searchResults);

    if (searchResults.length === 0) {
      showNoResultsMessage(decodedTerm);
    } else {
      // Display search results
      window.renderProductsGrid(searchResults);
    }

  } catch (error) {
    console.error('Error performing search:', error);
    showSearchErrorMessage();
  }
}

/**
 * Wait for ProductsManager to be available
 */
async function waitForProductsManager(maxAttempts = 50) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (window.searchProductsAPI && window.renderProductsGrid) {
      console.log('ProductsManager functions available');
      return;
    }

    console.log('Waiting for ProductsManager... attempt', attempts + 1);
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  throw new Error('ProductsManager functions not available after timeout');
}

/**
 * Show no results message
 * @param {string} searchTerm - Search term
 */
function showNoResultsMessage(searchTerm) {
  const container = document.querySelector('.products-container') || document.querySelector('.products-grid');

  if (container) {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>No encontramos resultados para "${searchTerm}"</h3>
        <p>Intenta con otros términos de búsqueda o navega por nuestras categorías</p>
        <button class="btn btn-primary" onclick="window.location.href='shop.html'">
          Ver todos los productos
        </button>
      </div>
    `;
  }
}

/**
 * Show search error message
 */
function showSearchErrorMessage() {
  const container = document.querySelector('.products-container') || document.querySelector('.products-grid');

  if (container) {
    container.innerHTML = `
      <div class="search-error">
        <div class="error-icon">⚠️</div>
        <h3>Error en la búsqueda</h3>
        <p>Ocurrió un problema al realizar la búsqueda. Por favor intenta nuevamente.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">
          Reintentar
        </button>
      </div>
    `;
  }
}

function updatePageTitleForSearch(searchTerm) {
  const pageTitle = document.querySelector('.page-title');
  const pageSubtitle = document.querySelector('.page-subtitle');

  if (pageTitle) {
    pageTitle.textContent = `Resultados para "${searchTerm}"`;
  }

  if (pageSubtitle) {
    pageSubtitle.textContent = 'Encuentra los productos que buscas';
  }
}

// ================================================
// FILTER INTERACTIONS
// ================================================

/**
 * Initialize filter interactions
 */
function initFilterInteractions() {
  // Availability filters
  initAvailabilityFilters();
  
  // Price range validation
  initPriceRangeValidation();
  
  // Filter change detection
  initFilterChangeDetection();
}

/**
 * Initialize availability filters
 */
function initAvailabilityFilters() {
  const availabilityFilters = document.querySelectorAll('input[value="in-stock"], input[value="sale"]');
  
  availabilityFilters.forEach(filter => {
    filter.addEventListener('change', () => {
      updateAvailabilityFilter();
    });
  });
}

/**
 * Update availability filter
 */
function updateAvailabilityFilter() {
  const inStockFilter = document.querySelector('input[value="in-stock"]');
  const saleFilter = document.querySelector('input[value="sale"]');
  
  // Update current filters (assuming ProductsManager handles this)
  if (window.ProductsManager) {
    // This would integrate with the filtering system
    window.ProductsManager.applyFiltersAndSort();
  }
}

/**
 * Initialize price range validation
 */
function initPriceRangeValidation() {
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  
  if (!priceMin || !priceMax) return;
  
  priceMin.addEventListener('input', validatePriceRange);
  priceMax.addEventListener('input', validatePriceRange);
}

/**
 * Validate price range inputs
 */
function validatePriceRange() {
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  
  if (!priceMin || !priceMax) return;
  
  const minValue = parseFloat(priceMin.value) || 0;
  const maxValue = parseFloat(priceMax.value) || Infinity;
  
  // Clear previous validation styles
  priceMin.style.borderColor = '';
  priceMax.style.borderColor = '';
  
  if (minValue > maxValue && maxValue > 0) {
    priceMin.style.borderColor = 'var(--danger-color)';
    priceMax.style.borderColor = 'var(--danger-color)';
    
    // Show validation message
    showPriceValidationMessage('El precio mínimo no puede ser mayor al máximo');
  } else {
    hidePriceValidationMessage();
  }
}

/**
 * Show price validation message
 * @param {string} message - Validation message
 */
function showPriceValidationMessage(message) {
  let msgElement = document.querySelector('.price-validation-message');
  
  if (!msgElement) {
    msgElement = document.createElement('div');
    msgElement.className = 'price-validation-message';
    msgElement.style.cssText = `
      color: var(--danger-color);
      font-size: var(--font-size-sm);
      margin-top: var(--spacing-xs);
    `;
    
    const priceRange = document.querySelector('.price-range');
    if (priceRange) {
      priceRange.appendChild(msgElement);
    }
  }
  
  msgElement.textContent = message;
}

/**
 * Hide price validation message
 */
function hidePriceValidationMessage() {
  const msgElement = document.querySelector('.price-validation-message');
  if (msgElement) {
    msgElement.remove();
  }
}

/**
 * Initialize filter change detection
 */
function initFilterChangeDetection() {
  const sidebar = document.getElementById('shop-sidebar');
  if (!sidebar) return;
  
  // Count active filters
  sidebar.addEventListener('change', () => {
    setTimeout(updateActiveFilterCount, 100);
  });
}

/**
 * Update active filter count display
 */
function updateActiveFilterCount() {
  const sidebar = document.getElementById('shop-sidebar');
  if (!sidebar) return;
  
  let activeCount = 0;
  
  // Count checked filters (excluding "all" options)
  const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]:checked');
  checkboxes.forEach(checkbox => {
    if (checkbox.value !== 'all') {
      activeCount++;
    }
  });
  
  // Count radio button filters (excluding "all" options)
  const radios = sidebar.querySelectorAll('input[type="radio"]:checked');
  radios.forEach(radio => {
    if (radio.value !== 'all') {
      activeCount++;
    }
  });
  
  // Count price filters
  const priceMin = document.getElementById('price-min');
  const priceMax = document.getElementById('price-max');
  
  if (priceMin && priceMin.value.trim()) activeCount++;
  if (priceMax && priceMax.value.trim()) activeCount++;
  
  // Update filter toggle button
  updateFilterToggleButton(activeCount);
}

/**
 * Update filter toggle button with active count
 * @param {number} count - Number of active filters
 */
function updateFilterToggleButton(count) {
  const filterToggle = document.getElementById('filter-toggle');
  if (!filterToggle) return;
  
  const filterIcon = filterToggle.querySelector('.filter-icon');
  
  if (count > 0) {
    filterToggle.classList.add('has-active-filters');
    
    // Add count badge
    let badge = filterToggle.querySelector('.filter-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'filter-count';
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: var(--primary-color);
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      `;
      filterToggle.style.position = 'relative';
      filterToggle.appendChild(badge);
    }
    badge.textContent = count;
  } else {
    filterToggle.classList.remove('has-active-filters');
    const badge = filterToggle.querySelector('.filter-count');
    if (badge) {
      badge.remove();
    }
  }
}

// ================================================
// RESPONSIVE BEHAVIOR
// ================================================

/**
 * Handle responsive behavior
 */
function initResponsiveBehavior() {
  // Handle window resize
  window.addEventListener('resize', TICS.throttle(() => {
    handleWindowResize();
  }, 250));
  
  // Initial check
  handleWindowResize();
}

/**
 * Handle window resize events
 */
function handleWindowResize() {
  const isMobile = window.innerWidth <= 768;
  
  // Auto-close mobile filters on desktop
  if (!isMobile) {
    closeMobileFilters();
  }
  
  // Adjust products grid
  adjustProductsGrid();
}

/**
 * Adjust products grid based on screen size
 */
function adjustProductsGrid() {
  const productsGrid = document.getElementById('products-grid');
  if (!productsGrid) return;
  
  const screenWidth = window.innerWidth;
  
  // Force grid view on very small screens
  if (screenWidth <= 480 && currentView === 'list') {
    const viewButtons = document.querySelectorAll('.view-btn');
    switchView('grid', viewButtons, productsGrid);
  }
}

// ================================================
// SCROLL TO TOP
// ================================================

/**
 * Add scroll to top functionality
 */
function initScrollToTop() {
  // Create scroll to top button
  const scrollBtn = document.createElement('button');
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.innerHTML = '↑';
  scrollBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--primary-color);
    color: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
    box-shadow: var(--shadow-lg);
  `;
  
  document.body.appendChild(scrollBtn);
  
  // Show/hide based on scroll position
  window.addEventListener('scroll', TICS.throttle(() => {
    if (window.scrollY > 300) {
      scrollBtn.style.opacity = '1';
    } else {
      scrollBtn.style.opacity = '0';
    }
  }, 100));
  
  // Scroll to top on click
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ================================================
// KEYBOARD SHORTCUTS
// ================================================

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only activate shortcuts if not in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch (e.key) {
      case 'f':
      case 'F':
        // Toggle filters on F key
        e.preventDefault();
        const filterToggle = document.getElementById('filter-toggle');
        if (filterToggle) {
          filterToggle.click();
        }
        break;
        
      case 'g':
      case 'G':
        // Toggle to grid view
        e.preventDefault();
        const gridBtn = document.querySelector('.view-btn[data-view="grid"]');
        if (gridBtn) {
          gridBtn.click();
        }
        break;
        
      case 'l':
      case 'L':
        // Toggle to list view
        e.preventDefault();
        const listBtn = document.querySelector('.view-btn[data-view="list"]');
        if (listBtn) {
          listBtn.click();
        }
        break;
    }
  });
}

// ================================================
// INITIALIZATION
// ================================================

/**
 * Initialize shop page functionality
 */
function initShopPage() {
  console.log('Initializing shop page...');
  
  // Core functionality
  initFilterSidebar();
  initViewToggle();
  initURLParameters();
  initFilterInteractions();
  initResponsiveBehavior();
  initScrollToTop();
  initKeyboardShortcuts();
  
  // Load preferences
  loadViewPreference();
  
  console.log('Shop page initialized successfully!');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the shop page
  if (window.location.pathname.includes('shop.html') ||
      document.getElementById('shop-sidebar')) {
    initShopPage();
  }
});

// Export functions for search.js to use
window.handleSearchParameter = handleSearchParameter;