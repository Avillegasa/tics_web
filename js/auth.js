// Authentication JavaScript

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Password confirmation validation
        const confirmPassword = document.getElementById('confirm_password');
        if (confirmPassword) {
            confirmPassword.addEventListener('blur', () => {
                this.validatePasswordMatch();
            });
        }
    }

    checkAuth() {
        const token = localStorage.getItem('user_token');
        if (token) {
            this.validateToken(token);
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
                this.currentUser = data.user;
                this.updateNavigation();
            } else {
                localStorage.removeItem('user_token');
                this.currentUser = null;
            }
        } catch (error) {
            console.error('Error validating token:', error);
            localStorage.removeItem('user_token');
            this.currentUser = null;
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

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
                localStorage.setItem('user_token', data.token);
                this.currentUser = data.user;
                this.showSuccess('Inicio de sesión exitoso');

                // Redirect to previous page or home
                const returnUrl = new URLSearchParams(window.location.search).get('return') || 'index.html';
                setTimeout(() => {
                    window.location.href = returnUrl;
                }, 1500);
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

    async handleRegister() {
        const formData = this.getFormData('register-form');

        // Validate passwords match
        if (formData.password !== formData.confirm_password) {
            this.showError('Las contraseñas no coinciden');
            return;
        }

        // Remove confirm_password from data
        delete formData.confirm_password;

        this.showLoading(true);

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('user_token', data.token);
                this.currentUser = data.user;
                this.showSuccess('Cuenta creada exitosamente');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                if (data.errors) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    this.showError(errorMessages);
                } else {
                    this.showError(data.error || 'Error al crear la cuenta');
                }
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showError('Error de conexión');
        } finally {
            this.showLoading(false);
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm_password').value;

        if (confirmPassword && password !== confirmPassword) {
            document.getElementById('confirm_password').setCustomValidity('Las contraseñas no coinciden');
        } else {
            document.getElementById('confirm_password').setCustomValidity('');
        }
    }

    getFormData(formId) {
        const form = document.getElementById(formId);
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (value.trim() !== '') {
                data[key] = value.trim();
            }
        }

        return data;
    }

    updateNavigation() {
        // This would update navigation to show user info
        // Implementation depends on navigation structure
    }

    logout() {
        localStorage.removeItem('user_token');
        this.currentUser = null;
        window.location.href = 'index.html';
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            if (show) {
                spinner.classList.add('active');
            } else {
                spinner.classList.remove('active');
            }
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

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

// Initialize authentication manager
const authManager = new AuthManager();

// Export for use in other scripts
window.authManager = authManager;