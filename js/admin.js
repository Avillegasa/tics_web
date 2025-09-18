// Admin Panel JavaScript

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.currentPage = 1;
        this.currentEditUserId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // User management
        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.showUserModal();
        });

        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });

        // Modal controls
        document.getElementById('modal-close').addEventListener('click', () => {
            this.hideUserModal();
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.hideUserModal();
        });

        // Close modal on background click
        document.getElementById('user-modal').addEventListener('click', (e) => {
            if (e.target.id === 'user-modal') {
                this.hideUserModal();
            }
        });

        // Product management
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.showProductModal();
        });

        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSubmit();
        });

        // Product modal controls
        document.getElementById('product-modal-close').addEventListener('click', () => {
            this.hideProductModal();
        });

        document.getElementById('product-cancel-btn').addEventListener('click', () => {
            this.hideProductModal();
        });

        // Close product modal on background click
        document.getElementById('product-modal').addEventListener('click', (e) => {
            if (e.target.id === 'product-modal') {
                this.hideProductModal();
            }
        });

        // Product search and filters
        document.getElementById('product-search').addEventListener('input', (e) => {
            this.debounce(() => this.filterProducts(), 300);
        });

        document.getElementById('product-category-filter').addEventListener('change', () => {
            this.filterProducts();
        });

        document.getElementById('product-status-filter').addEventListener('change', () => {
            this.filterProducts();
        });
    }

    checkAuthentication() {
        const token = localStorage.getItem('admin_token');
        if (token) {
            this.validateToken(token);
        } else {
            this.showLogin();
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user.role === 'admin') {
                    this.currentUser = data.user;
                    this.showAdminPanel();
                    this.loadDashboardData();
                } else {
                    this.showError('No tienes permisos de administrador');
                    this.showLogin();
                }
            } else {
                localStorage.removeItem('admin_token');
                this.showLogin();
            }
        } catch (error) {
            console.error('Error validating token:', error);
            this.showLogin();
        }
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        this.showLoading(true);

        // Debug: log what we're sending
        console.log('Sending login data:', { login: username, password });

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ login: username, password })
            });

            const data = await response.json();

            // Debug: log response
            console.log('Login response:', response.status, data);

            if (response.ok) {
                if (data.user.role !== 'admin') {
                    this.showError('No tienes permisos de administrador');
                    return;
                }

                localStorage.setItem('admin_token', data.token);
                this.currentUser = data.user;
                this.showAdminPanel();
                this.loadDashboardData();
                this.showSuccess('Inicio de sesión exitoso');
            } else {
                this.showError(data.error || 'Error al iniciar sesión');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Error de conexión');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        localStorage.removeItem('admin_token');
        this.currentUser = null;
        this.showLogin();
        this.showSuccess('Sesión cerrada correctamente');
    }

    showLogin() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('admin-content').style.display = 'none';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    }

    showAdminPanel() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        document.getElementById('admin-username').textContent = this.currentUser.first_name || this.currentUser.username;
        this.showSection('dashboard');
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Load section data
        if (sectionName === 'users') {
            this.loadUsers();
        } else if (sectionName === 'products') {
            this.loadProducts();
        }
    }

    async loadDashboardData() {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('total-users').textContent = data.pagination.total;
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadUsers(page = 1) {
        this.showLoading(true);

        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`/api/users?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderUsers(data.users);
                this.renderPagination(data.pagination);
                this.currentPage = page;
            } else {
                this.showError('Error al cargar usuarios');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Error de conexión');
        } finally {
            this.showLoading(false);
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td><span class="role-badge role-${user.role}">${user.role === 'admin' ? 'Admin' : 'Cliente'}</span></td>
                <td><span class="status-badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString('es-ES')}</td>
                <td class="actions">
                    <button class="btn-small btn-edit" onclick="adminPanel.editUser(${user.id})">Editar</button>
                    <button class="btn-small btn-delete" onclick="adminPanel.deleteUser(${user.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination) {
        const container = document.getElementById('users-pagination');
        container.innerHTML = '';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Anterior';
        prevBtn.disabled = pagination.page === 1;
        prevBtn.addEventListener('click', () => this.loadUsers(pagination.page - 1));
        container.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.toggle('active', i === pagination.page);
            pageBtn.addEventListener('click', () => this.loadUsers(i));
            container.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Siguiente';
        nextBtn.disabled = pagination.page === pagination.pages;
        nextBtn.addEventListener('click', () => this.loadUsers(pagination.page + 1));
        container.appendChild(nextBtn);
    }

    showUserModal(user = null) {
        this.currentEditUserId = user ? user.id : null;
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const title = document.getElementById('modal-title');

        if (user) {
            title.textContent = 'Editar Usuario';
            this.fillUserForm(user);
        } else {
            title.textContent = 'Agregar Usuario';
            form.reset();
            document.getElementById('user-password').required = true;
        }

        modal.classList.add('active');
    }

    hideUserModal() {
        const modal = document.getElementById('user-modal');
        modal.classList.remove('active');
        this.currentEditUserId = null;
    }

    fillUserForm(user) {
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').required = false;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-first-name').value = user.first_name || '';
        document.getElementById('user-last-name').value = user.last_name || '';
        document.getElementById('user-phone').value = user.phone || '';
        document.getElementById('user-city').value = user.city || '';
        document.getElementById('user-address').value = user.address || '';
        document.getElementById('user-postal-code').value = user.postal_code || '';
        document.getElementById('user-country').value = user.country || '';
    }

    async handleUserSubmit() {
        const formData = new FormData(document.getElementById('user-form'));
        const userData = {
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            password: document.getElementById('user-password').value,
            role: document.getElementById('user-role').value,
            first_name: document.getElementById('user-first-name').value,
            last_name: document.getElementById('user-last-name').value,
            phone: document.getElementById('user-phone').value,
            city: document.getElementById('user-city').value,
            address: document.getElementById('user-address').value,
            postal_code: document.getElementById('user-postal-code').value,
            country: document.getElementById('user-country').value
        };

        // Remove empty password for updates
        if (this.currentEditUserId && !userData.password) {
            delete userData.password;
        }

        this.showLoading(true);

        try {
            const token = localStorage.getItem('admin_token');
            const url = this.currentEditUserId
                ? `/api/users/${this.currentEditUserId}`
                : '/api/users/register';

            const method = this.currentEditUserId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.hideUserModal();
                this.loadUsers(this.currentPage);
                this.showSuccess(this.currentEditUserId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showError(errorMessages);
                } else {
                    this.showError(data.error || 'Error al guardar usuario');
                }
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Error de conexión');
        } finally {
            this.showLoading(false);
        }
    }

    async editUser(userId) {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.showUserModal(data.user);
            } else {
                this.showError('Error al cargar usuario');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.showError('Error de conexión');
        }
    }

    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            return;
        }

        this.showLoading(true);

        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.loadUsers(this.currentPage);
                this.showSuccess('Usuario eliminado correctamente');
            } else {
                const data = await response.json();
                this.showError(data.error || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Error de conexión');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (show) {
            spinner.classList.add('active');
        } else {
            spinner.classList.remove('active');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    // ================================================
    // PRODUCT MANAGEMENT METHODS
    // ================================================

    async loadProducts() {
        try {
            const token = localStorage.getItem('admin_token');
            const loadingElement = document.getElementById('products-loading');
            const tableBody = document.getElementById('products-table-body');
            const noDataElement = document.getElementById('products-no-data');

            if (loadingElement) loadingElement.style.display = 'block';
            if (tableBody) tableBody.innerHTML = '';
            if (noDataElement) noDataElement.style.display = 'none';

            const response = await fetch('/api/products', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.allProducts = data.products || [];
                this.renderProducts(this.allProducts);
                this.loadCategories();
            } else {
                this.showError('Error al cargar productos');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Error al cargar productos');
        } finally {
            const loadingElement = document.getElementById('products-loading');
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/products/categories');
            if (response.ok) {
                const data = await response.json();
                const categoryFilter = document.getElementById('product-category-filter');
                if (categoryFilter) {
                    // Clear existing options except "All categories"
                    const firstOption = categoryFilter.firstElementChild;
                    categoryFilter.innerHTML = '';
                    categoryFilter.appendChild(firstOption);

                    // Add category options
                    data.categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.category;
                        option.textContent = cat.category;
                        categoryFilter.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderProducts(products) {
        const tableBody = document.getElementById('products-table-body');
        const noDataElement = document.getElementById('products-no-data');
        const countElement = document.getElementById('products-count');

        if (!products || products.length === 0) {
            if (tableBody) tableBody.innerHTML = '';
            if (noDataElement) noDataElement.style.display = 'block';
            if (countElement) countElement.textContent = '0 productos';
            return;
        }

        if (noDataElement) noDataElement.style.display = 'none';
        if (countElement) countElement.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''}`;

        if (tableBody) {
            tableBody.innerHTML = products.map(product => this.createProductRow(product)).join('');

            // Add event listeners to action buttons
            tableBody.querySelectorAll('.edit-product-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = parseInt(e.target.dataset.productId);
                    this.editProduct(productId);
                });
            });

            tableBody.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = parseInt(e.target.dataset.productId);
                    const productTitle = e.target.dataset.productTitle;
                    this.deleteProduct(productId, productTitle);
                });
            });
        }
    }

    createProductRow(product) {
        const price = product.sale_price || product.price;
        const hasDiscount = product.sale_price && product.sale_price < product.price;
        const status = product.is_active ? 'Activo' : 'Inactivo';
        const statusClass = product.is_active ? 'status-active' : 'status-inactive';

        return `
            <tr>
                <td>${product.id}</td>
                <td>
                    <img src="${product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/50'}"
                         alt="${product.title}" class="product-thumbnail">
                </td>
                <td>
                    <div class="product-title-cell">
                        <strong>${this.escapeHtml(product.title)}</strong>
                        ${product.description ? `<br><small class="text-muted">${this.escapeHtml(product.description.substring(0, 100))}${product.description.length > 100 ? '...' : ''}</small>` : ''}
                    </div>
                </td>
                <td><code>${this.escapeHtml(product.sku)}</code></td>
                <td>${this.escapeHtml(product.category || 'Sin categoría')}</td>
                <td>
                    <div class="price-cell">
                        $${price.toFixed(2)}
                        ${hasDiscount ? `<br><small class="text-muted"><s>$${product.price.toFixed(2)}</s></small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="stock-badge ${product.stock <= 0 ? 'stock-low' : product.stock < 10 ? 'stock-medium' : 'stock-high'}">
                        ${product.stock}
                    </span>
                </td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary edit-product-btn"
                                data-product-id="${product.id}" title="Editar">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-danger delete-product-btn"
                                data-product-id="${product.id}"
                                data-product-title="${this.escapeHtml(product.title)}" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    showProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        const title = document.getElementById('product-modal-title');

        this.currentEditProductId = product ? product.id : null;

        if (product) {
            title.textContent = 'Editar Producto';
            this.populateProductForm(product);
        } else {
            title.textContent = 'Agregar Producto';
            form.reset();
        }

        modal.style.display = 'flex';
    }

    hideProductModal() {
        document.getElementById('product-modal').style.display = 'none';
        document.getElementById('product-form').reset();
        this.currentEditProductId = null;
    }

    populateProductForm(product) {
        document.getElementById('product-title').value = product.title || '';
        document.getElementById('product-sku').value = product.sku || '';
        document.getElementById('product-category').value = product.category || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-sale-price').value = product.sale_price || '';
        document.getElementById('product-stock').value = product.stock || 0;
        document.getElementById('product-rating').value = product.rating || 0;
        document.getElementById('product-description').value = product.description || '';

        // Handle images array
        if (product.images && Array.isArray(product.images)) {
            document.getElementById('product-images').value = product.images.join('\n');
        }

        // Handle tags array
        if (product.tags && Array.isArray(product.tags)) {
            document.getElementById('product-tags').value = product.tags.join(', ');
        }

        // Handle attributes object
        if (product.attributes && typeof product.attributes === 'object') {
            document.getElementById('product-attributes').value = JSON.stringify(product.attributes, null, 2);
        }
    }

    async handleProductSubmit() {
        try {
            const formData = this.getProductFormData();

            // Validation
            if (!formData.title || !formData.sku || !formData.price) {
                this.showError('Por favor completa todos los campos requeridos');
                return;
            }

            if (formData.price <= 0) {
                this.showError('El precio debe ser mayor a 0');
                return;
            }

            if (formData.sale_price && formData.sale_price >= formData.price) {
                this.showError('El precio de oferta debe ser menor al precio regular');
                return;
            }

            // Validate JSON attributes
            if (formData.attributes) {
                try {
                    JSON.parse(formData.attributes);
                } catch (e) {
                    this.showError('El formato de atributos no es JSON válido');
                    return;
                }
            }

            const token = localStorage.getItem('admin_token');
            const url = this.currentEditProductId
                ? `/api/products/${this.currentEditProductId}`
                : '/api/products';
            const method = this.currentEditProductId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(this.currentEditProductId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente');
                this.hideProductModal();
                this.loadProducts();
            } else {
                this.showError(data.error || 'Error al guardar producto');
            }
        } catch (error) {
            console.error('Error submitting product:', error);
            this.showError('Error al guardar producto');
        }
    }

    getProductFormData() {
        const formData = {
            title: document.getElementById('product-title').value.trim(),
            sku: document.getElementById('product-sku').value.trim(),
            category: document.getElementById('product-category').value.trim(),
            price: parseFloat(document.getElementById('product-price').value),
            sale_price: document.getElementById('product-sale-price').value ? parseFloat(document.getElementById('product-sale-price').value) : null,
            stock: parseInt(document.getElementById('product-stock').value) || 0,
            rating: parseFloat(document.getElementById('product-rating').value) || 0,
            description: document.getElementById('product-description').value.trim()
        };

        // Process images
        const imagesText = document.getElementById('product-images').value.trim();
        formData.images = imagesText ? imagesText.split('\n').map(url => url.trim()).filter(url => url) : [];

        // Process tags
        const tagsText = document.getElementById('product-tags').value.trim();
        formData.tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        // Process attributes
        const attributesText = document.getElementById('product-attributes').value.trim();
        if (attributesText) {
            try {
                formData.attributes = JSON.parse(attributesText);
            } catch (e) {
                formData.attributes = {};
            }
        } else {
            formData.attributes = {};
        }

        return formData;
    }

    editProduct(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (product) {
            this.showProductModal(product);
        }
    }

    async deleteProduct(productId, productTitle) {
        if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${productTitle}"?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Producto eliminado exitosamente');
                this.loadProducts();
            } else {
                this.showError(data.error || 'Error al eliminar producto');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            this.showError('Error al eliminar producto');
        }
    }

    filterProducts() {
        if (!this.allProducts) return;

        const searchTerm = document.getElementById('product-search').value.toLowerCase().trim();
        const categoryFilter = document.getElementById('product-category-filter').value;
        const statusFilter = document.getElementById('product-status-filter').value;

        let filtered = this.allProducts.filter(product => {
            // Search filter
            if (searchTerm) {
                const searchableText = [
                    product.title,
                    product.description,
                    product.sku,
                    product.category
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Category filter
            if (categoryFilter && product.category !== categoryFilter) {
                return false;
            }

            // Status filter
            if (statusFilter) {
                if (statusFilter === 'active' && !product.is_active) {
                    return false;
                }
                if (statusFilter === 'inactive' && product.is_active) {
                    return false;
                }
            }

            return true;
        });

        this.renderProducts(filtered);
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();