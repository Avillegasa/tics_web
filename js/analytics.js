/**
 * TICS Store Analytics Tracker
 * Tracks user behavior for business intelligence
 */

class AnalyticsTracker {
    constructor() {
        this.sessionId = this.getOrCreateSessionId();
        this.init();
    }

    init() {
        // Track page views automatically
        this.trackPageView();

        // Set up automatic tracking
        this.setupProductViewTracking();
        this.setupCartTracking();
        this.setupSearchTracking();

        console.log('📊 Analytics tracking initialized');
    }

    // Generate or retrieve session ID
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('tics_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2);
            sessionStorage.setItem('tics_session_id', sessionId);
        }
        return sessionId;
    }

    // Generic event tracking method
    async trackEvent(eventType, data = {}) {
        try {
            const payload = {
                event_type: eventType,
                session_id: this.sessionId,
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_title: document.title,
                ...data
            };

            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Session-ID': this.sessionId
                },
                body: JSON.stringify(payload)
            });

            console.log('📊 Tracked:', eventType, data);
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
        }
    }

    // Track page views
    trackPageView() {
        this.trackEvent('page_view', {
            page_type: this.getPageType(),
            referrer: document.referrer
        });
    }

    // Determine page type
    getPageType() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('/shop')) return 'shop';
        if (path.includes('/product.html')) return 'product';
        if (path.includes('/cart')) return 'cart';
        if (path.includes('/admin')) return 'admin';
        return 'other';
    }

    // Track product views
    setupProductViewTracking() {
        // Track when viewing a product detail page
        if (window.location.pathname.includes('product.html')) {
            const productId = this.getProductIdFromURL();
            if (productId) {
                // Wait a moment to ensure product data is loaded
                setTimeout(() => {
                    const productTitle = document.querySelector('h1')?.textContent;
                    const productCategory = this.getProductCategory();

                    this.trackEvent('product_view', {
                        product_id: parseInt(productId),
                        category: productCategory,
                        product_title: productTitle
                    });
                }, 500);
            }
        }

        // Track product clicks in listings
        document.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product-card');
            if (productCard) {
                const productId = productCard.dataset.productId;
                if (productId && !e.target.closest('.add-to-cart-btn')) {
                    this.trackEvent('product_view', {
                        product_id: parseInt(productId),
                        source: 'product_listing'
                    });
                }
            }
        });
    }

    // Track cart interactions
    setupCartTracking() {
        // Listen for add to cart clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn') ||
                e.target.closest('.add-to-cart-btn')) {

                const button = e.target.closest('.add-to-cart-btn');
                const productId = button?.dataset.productId;

                if (productId) {
                    this.trackEvent('cart_add', {
                        product_id: parseInt(productId),
                        quantity: 1,
                        source: this.getPageType()
                    });
                }
            }
        });
    }

    // Track search behavior
    setupSearchTracking() {
        // Track search submissions
        const searchForms = document.querySelectorAll('#search-form, .search-form');
        searchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const searchInput = form.querySelector('input[type="search"], input[type="text"]');
                if (searchInput && searchInput.value.trim()) {
                    this.trackSearchEvent(searchInput.value.trim());
                }
            });
        });

        // Track search input changes (for autocomplete/suggestions)
        const searchInputs = document.querySelectorAll('#search-input, .search-input');
        searchInputs.forEach(input => {
            let searchTimeout;
            input.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (e.target.value.trim().length >= 3) {
                        this.trackSearchEvent(e.target.value.trim(), 'autocomplete');
                    }
                }, 1000);
            });
        });

        // Track filter usage
        document.addEventListener('change', (e) => {
            if (e.target.matches('.filter-checkbox input, .filter-select, #sort-select')) {
                const filterType = e.target.name || e.target.id || 'unknown';
                const filterValue = e.target.value;

                this.trackEvent('filter_use', {
                    filter_type: filterType,
                    filter_value: filterValue,
                    filter_data: {
                        checked: e.target.checked
                    }
                });
            }
        });
    }

    // Track search with results count
    async trackSearchEvent(query, source = 'search_form') {
        try {
            // Get current results count if available
            let resultsCount = 0;
            const resultsCountElement = document.getElementById('results-count');
            if (resultsCountElement) {
                const match = resultsCountElement.textContent.match(/(\d+)/);
                resultsCount = match ? parseInt(match[1]) : 0;
            }

            await this.trackEvent('search', {
                search_query: query,
                source: source,
                filter_data: {
                    results_count: resultsCount,
                    page: this.getPageType()
                }
            });
        } catch (error) {
            console.warn('Search tracking failed:', error);
        }
    }

    // Helper methods
    getProductIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    getProductCategory() {
        // Try to extract category from breadcrumb or product data
        const breadcrumb = document.querySelector('.breadcrumb, .product-category');
        return breadcrumb?.textContent?.trim() || null;
    }

    // Public method for manual tracking
    track(eventType, data) {
        return this.trackEvent(eventType, data);
    }

    // Track custom events
    trackCustomEvent(eventName, properties = {}) {
        return this.trackEvent('custom_event', {
            event_name: eventName,
            ...properties
        });
    }
}

// Initialize analytics when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not in admin panel
    if (!window.location.pathname.includes('/admin')) {
        window.analyticsTracker = new AnalyticsTracker();
    }
});

// Export for manual use
window.AnalyticsTracker = AnalyticsTracker;