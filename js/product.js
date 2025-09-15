/*
  TICS Store - Product Page Functionality
  
  This module handles:
  - Product page initialization
  - Product data loading from URL parameters
  - Image gallery management
  - Product variants selection
  - Quantity controls
  - Add to cart functionality
  - Tabs management
  - Related products display
  - SEO metadata updates
*/

// ================================================
// PRODUCT PAGE STATE
// ================================================
let currentProduct = null;
let selectedVariants = {};
let selectedQuantity = 1;
let selectedImageIndex = 0;

// ================================================
// PRODUCT DATA LOADING
// ================================================

/**
 * Load and display product data
 */
async function loadProductData() {
  const productId = TICS.getQueryParam('id');
  
  if (!productId) {
    showProductNotFound();
    return;
  }
  
  try {
    // Wait for products to be loaded
    if (window.ProductsManager) {
      await window.ProductsManager.loadProducts();
      currentProduct = window.ProductsManager.getProductById(parseInt(productId));
    }
    
    if (!currentProduct) {
      showProductNotFound();
      return;
    }
    
    // Display product data
    displayProduct(currentProduct);
    
    // Update SEO metadata
    updateSEOMetadata(currentProduct);
    
    // Load related products
    loadRelatedProducts(currentProduct);
    
  } catch (error) {
    console.error('Error loading product:', error);
    TICS.ToastManager.error('Error al cargar el producto');
    showProductNotFound();
  }
}

/**
 * Show product not found message
 */
function showProductNotFound() {
  const productContent = document.getElementById('product-content');
  if (productContent) {
    productContent.innerHTML = `
      <div class="product-not-found">
        <h2>Producto no encontrado</h2>
        <p>El producto que buscas no existe o ha sido eliminado.</p>
        <a href="shop.html" class="btn btn-primary">Ver todos los productos</a>
      </div>
    `;
  }
  
  // Update page title
  document.title = 'Producto no encontrado - TICS Store';
}

// ================================================
// PRODUCT DISPLAY
// ================================================

/**
 * Display product data in the page
 * @param {Object} product - Product data
 */
function displayProduct(product) {
  // Update product images
  updateProductImages(product.images);
  
  // Update product info
  updateProductInfo(product);
  
  // Update product specifications
  updateProductSpecifications(product);
  
  // Update breadcrumb
  updateBreadcrumb(product);
  
  // Initialize product interactions
  initProductInteractions();
}

/**
 * Update product images
 * @param {Array} images - Array of image URLs
 */
function updateProductImages(images) {
  const mainImage = document.getElementById('main-product-image');
  const thumbnailContainer = document.getElementById('thumbnail-images');
  
  if (mainImage && images.length > 0) {
    mainImage.src = images[0];
    mainImage.alt = currentProduct.title;
  }
  
  if (thumbnailContainer && images.length > 1) {
    const thumbnailsHTML = images.map((image, index) => `
      <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
        <img src="${image}" alt="${TICS.sanitizeHTML(currentProduct.title)} - Imagen ${index + 1}" loading="lazy">
      </div>
    `).join('');
    
    thumbnailContainer.innerHTML = thumbnailsHTML;
    
    // Add click handlers for thumbnails
    initImageGallery();
  }
}

/**
 * Update product information
 * @param {Object} product - Product data
 */
function updateProductInfo(product) {
  // Update product name
  const productName = document.getElementById('product-name');
  if (productName) {
    productName.textContent = product.title;
  }
  
  // Update rating
  updateProductRating(product.rating);
  
  // Update pricing
  updateProductPricing(product);
  
  // Update description
  const productDesc = document.getElementById('product-desc');
  if (productDesc) {
    productDesc.textContent = product.description;
  }
  
  // Update variants
  updateProductVariants(product.attributes || {});
  
  // Update stock info
  updateStockInfo(product.stock);
  
  // Update metadata
  updateProductMetadata(product);
}

/**
 * Update product rating display
 * @param {number} rating - Product rating
 */
function updateProductRating(rating) {
  const ratingContainer = document.getElementById('product-rating');
  if (!ratingContainer) return;
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '⭐'.repeat(fullStars);
  if (hasHalfStar) stars += '⭐';
  
  ratingContainer.innerHTML = `
    <span class="stars">${stars}</span>
    <span class="rating-number">(${rating})</span>
  `;
}

/**
 * Update product pricing display
 * @param {Object} product - Product data
 */
function updateProductPricing(product) {
  const pricingContainer = document.getElementById('product-pricing');
  if (!pricingContainer) return;
  
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const currentPrice = product.salePrice || product.price;
  
  let pricingHTML = `<span class="current-price">${TICS.formatCurrency(currentPrice)}</span>`;
  
  if (hasDiscount) {
    const discountPercentage = Math.round(((product.price - product.salePrice) / product.price) * 100);
    pricingHTML += `
      <span class="original-price">${TICS.formatCurrency(product.price)}</span>
      <span class="discount-badge">-${discountPercentage}%</span>
    `;
  }
  
  pricingContainer.innerHTML = pricingHTML;
}

/**
 * Update product variants
 * @param {Object} attributes - Product attributes/variants
 */
function updateProductVariants(attributes) {
  const variantsContainer = document.getElementById('product-variants');
  if (!variantsContainer) return;
  
  const attributeKeys = Object.keys(attributes);
  if (attributeKeys.length === 0) {
    variantsContainer.style.display = 'none';
    return;
  }
  
  const variantsHTML = attributeKeys.map(key => {
    const options = attributes[key];
    return `
      <div class="variant-group">
        <label class="variant-label">${capitalizeFirst(key)}:</label>
        <div class="variant-options" data-variant="${key}">
          ${options.map(option => `
            <div class="variant-option" data-value="${option}">${option}</div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  variantsContainer.innerHTML = variantsHTML;
  
  // Initialize variant selection
  initVariantSelection();
}

/**
 * Update stock information
 * @param {number} stock - Available stock
 */
function updateStockInfo(stock) {
  const stockInfo = document.getElementById('stock-info');
  const addToCartBtn = document.getElementById('add-to-cart');
  
  if (stockInfo) {
    if (stock > 0) {
      stockInfo.textContent = `En stock (${stock} disponibles)`;
      stockInfo.className = 'stock-info in-stock';
    } else {
      stockInfo.textContent = 'Agotado';
      stockInfo.className = 'stock-info out-of-stock';
    }
  }
  
  if (addToCartBtn) {
    if (stock > 0) {
      addToCartBtn.disabled = false;
      addToCartBtn.textContent = 'Agregar al Carrito';
    } else {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = 'Agotado';
    }
  }
}

/**
 * Update product metadata
 * @param {Object} product - Product data
 */
function updateProductMetadata(product) {
  const metaContainer = document.getElementById('product-meta');
  if (!metaContainer) return;
  
  const metaHTML = `
    <div class="meta-item"><strong>SKU:</strong> ${product.sku}</div>
    <div class="meta-item"><strong>Categoría:</strong> <a href="shop.html?category=${encodeURIComponent(product.category)}">${product.category}</a></div>
    ${product.tags ? `<div class="meta-item"><strong>Tags:</strong> ${product.tags.join(', ')}</div>` : ''}
  `;
  
  metaContainer.innerHTML = metaHTML;
}

/**
 * Update product specifications
 * @param {Object} product - Product data
 */
function updateProductSpecifications(product) {
  const specsContainer = document.getElementById('product-specifications');
  if (!specsContainer) return;
  
  // Generate specifications from available data
  const specs = [];
  
  if (product.attributes) {
    Object.entries(product.attributes).forEach(([key, values]) => {
      specs.push({ label: capitalizeFirst(key), value: values.join(', ') });
    });
  }
  
  // Add other product info as specs
  specs.push({ label: 'Categoría', value: product.category });
  specs.push({ label: 'SKU', value: product.sku });
  specs.push({ label: 'Valoración', value: `${product.rating}/5 estrellas` });
  
  const specsHTML = specs.map(spec => `
    <div class="spec-item">
      <div class="spec-label">${spec.label}</div>
      <div class="spec-value">${spec.value}</div>
    </div>
  `).join('');
  
  specsContainer.innerHTML = specsHTML;
}

/**
 * Update breadcrumb navigation
 * @param {Object} product - Product data
 */
function updateBreadcrumb(product) {
  const breadcrumbProduct = document.getElementById('breadcrumb-product');
  if (breadcrumbProduct) {
    breadcrumbProduct.textContent = product.title;
  }
}

// ================================================
// IMAGE GALLERY
// ================================================

/**
 * Initialize image gallery functionality
 */
function initImageGallery() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.getElementById('main-product-image');
  
  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
      selectImage(index, thumbnails, mainImage);
    });
  });
  
  // Add keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('.product-gallery')) {
      handleImageKeyNavigation(e);
    }
  });
}

/**
 * Select image in gallery
 * @param {number} index - Image index
 * @param {NodeList} thumbnails - Thumbnail elements
 * @param {HTMLElement} mainImage - Main image element
 */
function selectImage(index, thumbnails, mainImage) {
  selectedImageIndex = index;
  
  // Update thumbnails
  thumbnails.forEach((thumb, i) => {
    thumb.classList.toggle('active', i === index);
  });
  
  // Update main image
  if (mainImage && currentProduct.images[index]) {
    mainImage.src = currentProduct.images[index];
    
    // Add loading animation
    mainImage.style.opacity = '0.7';
    mainImage.onload = () => {
      mainImage.style.opacity = '1';
    };
  }
}

/**
 * Handle keyboard navigation for image gallery
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleImageKeyNavigation(e) {
  if (!currentProduct || !currentProduct.images) return;
  
  const maxIndex = currentProduct.images.length - 1;
  
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      const prevIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : maxIndex;
      selectImageByIndex(prevIndex);
      break;
      
    case 'ArrowRight':
      e.preventDefault();
      const nextIndex = selectedImageIndex < maxIndex ? selectedImageIndex + 1 : 0;
      selectImageByIndex(nextIndex);
      break;
  }
}

/**
 * Select image by index
 * @param {number} index - Image index
 */
function selectImageByIndex(index) {
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.getElementById('main-product-image');
  selectImage(index, thumbnails, mainImage);
}

// ================================================
// VARIANT SELECTION
// ================================================

/**
 * Initialize variant selection functionality
 */
function initVariantSelection() {
  const variantOptions = document.querySelectorAll('.variant-option');
  
  variantOptions.forEach(option => {
    option.addEventListener('click', () => {
      selectVariantOption(option);
    });
  });
}

/**
 * Select variant option
 * @param {HTMLElement} option - Selected option element
 */
function selectVariantOption(option) {
  const variantGroup = option.closest('.variant-options');
  const variantType = variantGroup.dataset.variant;
  const variantValue = option.dataset.value;
  
  // Update UI
  variantGroup.querySelectorAll('.variant-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  option.classList.add('selected');
  
  // Update state
  selectedVariants[variantType] = variantValue;
  
  // Update price if variant affects pricing (future enhancement)
  // updatePricingForVariant();
}

// ================================================
// QUANTITY CONTROLS
// ================================================

/**
 * Initialize quantity controls
 */
function initQuantityControls() {
  const quantityInput = document.getElementById('quantity');
  const minusBtn = document.getElementById('qty-minus');
  const plusBtn = document.getElementById('qty-plus');
  
  if (!quantityInput) return;
  
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      updateQuantity(selectedQuantity - 1);
    });
  }
  
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      updateQuantity(selectedQuantity + 1);
    });
  }
  
  quantityInput.addEventListener('change', (e) => {
    updateQuantity(parseInt(e.target.value) || 1);
  });
}

/**
 * Update quantity
 * @param {number} newQuantity - New quantity value
 */
function updateQuantity(newQuantity) {
  const quantityInput = document.getElementById('quantity');
  const maxQuantity = Math.min(currentProduct?.stock || 99, 99);
  
  // Validate quantity
  if (newQuantity < 1) newQuantity = 1;
  if (newQuantity > maxQuantity) {
    newQuantity = maxQuantity;
    TICS.ToastManager.warning(`Cantidad máxima disponible: ${maxQuantity}`);
  }
  
  selectedQuantity = newQuantity;
  
  if (quantityInput) {
    quantityInput.value = newQuantity;
  }
}

// ================================================
// ADD TO CART
// ================================================

/**
 * Initialize add to cart functionality
 */
function initAddToCart() {
  const addToCartBtn = document.getElementById('add-to-cart');
  const buyNowBtn = document.getElementById('buy-now');
  
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', handleAddToCart);
  }
  
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', handleBuyNow);
  }
}

/**
 * Handle add to cart button click
 */
function handleAddToCart() {
  if (!currentProduct) return;
  
  if (currentProduct.stock < selectedQuantity) {
    TICS.ToastManager.error('No hay suficiente stock disponible');
    return;
  }
  
  // Check if required variants are selected
  if (!areRequiredVariantsSelected()) {
    TICS.ToastManager.warning('Por favor, selecciona todas las opciones del producto');
    return;
  }
  
  // Add to cart
  if (window.addToCart) {
    window.addToCart(currentProduct, selectedQuantity, selectedVariants);
  }
}

/**
 * Handle buy now button click
 */
function handleBuyNow() {
  // First add to cart
  handleAddToCart();
  
  // Then redirect to checkout
  setTimeout(() => {
    window.location.href = 'checkout.html';
  }, 500);
}

/**
 * Check if all required variants are selected
 * @returns {boolean} True if all required variants are selected
 */
function areRequiredVariantsSelected() {
  const variantGroups = document.querySelectorAll('.variant-group');
  
  for (let group of variantGroups) {
    const variantType = group.querySelector('.variant-options').dataset.variant;
    if (!selectedVariants[variantType]) {
      return false;
    }
  }
  
  return true;
}

// ================================================
// TABS MANAGEMENT
// ================================================

/**
 * Initialize tabs functionality
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      switchTab(targetTab, tabButtons, tabPanes);
    });
  });
}

/**
 * Switch active tab
 * @param {string} tabName - Tab name to switch to
 * @param {NodeList} buttons - Tab button elements
 * @param {NodeList} panes - Tab pane elements
 */
function switchTab(tabName, buttons, panes) {
  // Update buttons
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update panes
  panes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabName);
  });
}

// ================================================
// RELATED PRODUCTS
// ================================================

/**
 * Load and display related products
 * @param {Object} product - Current product
 */
function loadRelatedProducts(product) {
  const relatedContainer = document.getElementById('related-products');
  if (!relatedContainer) return;
  
  if (window.ProductsManager) {
    const relatedProducts = window.ProductsManager.getRelatedProducts(product);
    
    if (relatedProducts.length > 0) {
      window.ProductsManager.renderProductsGrid(relatedProducts, relatedContainer, true);
    } else {
      relatedContainer.style.display = 'none';
    }
  }
}

// ================================================
// SEO METADATA
// ================================================

/**
 * Update SEO metadata for the product
 * @param {Object} product - Product data
 */
function updateSEOMetadata(product) {
  // Update page title
  document.title = `${product.title} - TICS Store`;
  
  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', 
      `${product.description.substring(0, 150)}... Precio: ${TICS.formatCurrency(product.salePrice || product.price)}`
    );
  }
  
  // Update meta keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords && product.tags) {
    metaKeywords.setAttribute('content', 
      [product.title, product.category, ...product.tags].join(', ')
    );
  }
  
  // Update structured data
  updateStructuredData(product);
}

/**
 * Update JSON-LD structured data
 * @param {Object} product - Product data
 */
function updateStructuredData(product) {
  const structuredDataScript = document.getElementById('product-structured-data');
  if (!structuredDataScript) return;
  
  const currentPrice = product.salePrice || product.price;
  const availability = product.stock > 0 ? 'InStock' : 'OutOfStock';
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "sku": product.sku,
    "category": product.category,
    "image": product.images,
    "offers": {
      "@type": "Offer",
      "price": currentPrice,
      "priceCurrency": "EUR",
      "availability": `https://schema.org/${availability}`,
      "url": window.location.href
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "ratingCount": Math.floor(Math.random() * 100) + 10 // Demo data
    }
  };
  
  structuredDataScript.textContent = JSON.stringify(structuredData);
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ================================================
// PRODUCT INTERACTIONS
// ================================================

/**
 * Initialize all product page interactions
 */
function initProductInteractions() {
  initQuantityControls();
  initAddToCart();
  initTabs();
}

// ================================================
// INITIALIZATION
// ================================================

/**
 * Initialize product page
 */
async function initProductPage() {
  console.log('Initializing product page...');
  
  try {
    await loadProductData();
    console.log('Product page initialized successfully!');
  } catch (error) {
    console.error('Error initializing product page:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the product page
  if (window.location.pathname.includes('product.html') || 
      document.getElementById('product-content')) {
    initProductPage();
  }
});