/**
 * TICS Store - Search Module
 * Simple and effective search functionality using backend API
 */

class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchButton = null;
        this.suggestionsContainer = null;
        this.searchDelay = 300;
        this.minSearchLength = 2;
        this.maxSuggestions = 5;
        this.searchTimeout = null;
        this.currentSearchTerm = '';
        this.isInitialized = false;

        this.init();
    }

    /**
     * Initialize search functionality
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    /**
     * Setup search elements and event listeners
     */
    setup() {
        // Find search elements
        this.searchInput = document.getElementById('search-input');
        this.searchButton = document.getElementById('search-btn');
        this.suggestionsContainer = document.getElementById('search-suggestions');

        if (!this.searchInput) {
            console.warn('Search input not found');
            return;
        }

        // Create suggestions container if it doesn't exist
        if (!this.suggestionsContainer) {
            this.createSuggestionsContainer();
        }

        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Search functionality initialized');
    }

    /**
     * Create suggestions container
     */
    createSuggestionsContainer() {
        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.id = 'search-suggestions';
        this.suggestionsContainer.className = 'search-suggestions';
        this.suggestionsContainer.style.display = 'none';

        const searchContainer = this.searchInput.closest('.search-container') || this.searchInput.parentElement;
        searchContainer.style.position = 'relative';
        searchContainer.appendChild(this.suggestionsContainer);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.searchInput.addEventListener('focus', () => this.handleFocus());

        // Search button click
        if (this.searchButton) {
            this.searchButton.addEventListener('click', (e) => this.handleSearchSubmit(e));
        }

        // Form submission (if input is in a form)
        const form = this.searchInput.closest('form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSearchSubmit(e));
        }

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    /**
     * Handle search input changes
     */
    handleSearchInput(event) {
        const query = event.target.value.trim();
        this.currentSearchTerm = query;

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce search suggestions
        this.searchTimeout = setTimeout(() => {
            if (query.length >= this.minSearchLength) {
                this.fetchSuggestions(query);
            } else {
                this.hideSuggestions();
            }
        }, this.searchDelay);
    }

    /**
     * Handle keydown events
     */
    handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.performSearch();
        } else if (event.key === 'Escape') {
            this.hideSuggestions();
            this.searchInput.blur();
        }
    }

    /**
     * Handle focus events
     */
    handleFocus() {
        if (this.currentSearchTerm && this.currentSearchTerm.length >= this.minSearchLength) {
            this.fetchSuggestions(this.currentSearchTerm);
        }
    }

    /**
     * Handle search submit
     */
    handleSearchSubmit(event) {
        event.preventDefault();
        this.performSearch();
    }

    /**
     * Fetch search suggestions from API
     */
    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/products/search/suggestions?q=${encodeURIComponent(query)}&limit=${this.maxSuggestions}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.displaySuggestions(data.suggestions, query);
            } else {
                this.hideSuggestions();
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
            this.hideSuggestions();
        }
    }

    /**
     * Display search suggestions
     */
    displaySuggestions(suggestions, query) {
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        const html = suggestions.map(suggestion => `
            <div class="search-suggestion" data-product-id="${suggestion.id}">
                <div class="suggestion-content">
                    <div class="suggestion-title">${this.highlightMatch(suggestion.title, query)}</div>
                    <div class="suggestion-meta">
                        <span class="suggestion-category">${suggestion.category}</span>
                        <span class="suggestion-price">€${suggestion.price}</span>
                    </div>
                </div>
            </div>
        `).join('');

        this.suggestionsContainer.innerHTML = html;
        this.showSuggestions();
        this.setupSuggestionClickHandlers();
    }

    /**
     * Setup click handlers for suggestions
     */
    setupSuggestionClickHandlers() {
        const suggestions = this.suggestionsContainer.querySelectorAll('.search-suggestion');

        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = suggestion.dataset.productId;
                if (productId) {
                    window.location.href = `product.html?id=${productId}`;
                }
            });
        });
    }

    /**
     * Highlight matching text in suggestions
     */
    highlightMatch(text, query) {
        if (!query) return text;

        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Show suggestions container
     */
    showSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'block';
        }
    }

    /**
     * Hide suggestions container
     */
    hideSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.style.display = 'none';
        }
    }

    /**
     * Perform search and redirect to results
     */
    performSearch(customQuery = null) {
        const query = customQuery || this.searchInput.value.trim();

        if (!query || query.length < this.minSearchLength) {
            alert(`Por favor ingresa al menos ${this.minSearchLength} caracteres para buscar`);
            return;
        }

        this.hideSuggestions();

        console.log('Performing search for:', query);

        // Check if we're already on shop page
        if (window.location.pathname.includes('shop.html')) {
            // Update URL and trigger search
            const url = new URL(window.location.href);
            url.searchParams.set('search', query);

            // Update URL without reloading
            window.history.pushState(null, '', url.toString());

            // Trigger search directly
            if (window.handleSearchParameter) {
                window.handleSearchParameter(query);
            } else {
                // Fallback: reload page
                window.location.href = url.toString();
            }
        } else {
            // Navigate to shop page with search query
            const url = new URL('shop.html', window.location.origin);
            url.searchParams.set('search', query);
            window.location.href = url.toString();
        }
    }

    /**
     * Clear search input
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.currentSearchTerm = '';
            this.hideSuggestions();
        }
    }

    /**
     * Public API methods
     */
    getSearchTerm() {
        return this.currentSearchTerm;
    }

    setSearchTerm(term) {
        if (this.searchInput) {
            this.searchInput.value = term;
            this.currentSearchTerm = term;
        }
    }

    isReady() {
        return this.isInitialized;
    }
}

// Initialize search manager
let searchManager = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        searchManager = new SearchManager();
    });
} else {
    searchManager = new SearchManager();
}

// Export for global access
window.SearchManager = searchManager;

// Export class for potential reuse
window.SearchManagerClass = SearchManager;