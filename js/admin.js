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

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

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
}

// Initialize admin panel
const adminPanel = new AdminPanel();