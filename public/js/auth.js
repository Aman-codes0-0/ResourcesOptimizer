class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    /**
     * Register a new user
     */
    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const data = await response.json();
            this.setAuth(data.token, data.refreshToken, data.user);
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Login user
     */
    async login(credentials) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            this.setAuth(data.token, data.refreshToken, data.user);
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: this.getAuthHeader()
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me', {
                headers: this.getAuthHeader()
            });

            if (!response.ok) {
                throw new Error('Failed to get user');
            }

            const user = await response.json();
            this.user = user;
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        } catch (error) {
            this.clearAuth();
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    async refresh() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            this.token = data.token;
            localStorage.setItem('token', data.token);
            return data.token;
        } catch (error) {
            this.clearAuth();
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async forgotPassword(email) {
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(token, newPassword) {
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Password reset failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Set authentication data
     */
    setAuth(token, refreshToken, user) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Clear authentication data
     */
    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Check if user has specific role
     */
    hasRole(...roles) {
        return this.user && roles.includes(this.user.role);
    }

    /**
     * Get authorization header
     */
    getAuthHeader() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Make authenticated API request
     */
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getAuthHeader(),
                    ...options.headers
                }
            });

            // Handle token expiration
            if (response.status === 401 && this.refreshToken) {
                await this.refresh();
                // Retry request with new token
                return fetch(url, {
                    ...options,
                    headers: {
                        ...this.getAuthHeader(),
                        ...options.headers
                    }
                });
            }

            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/pages/login.html';
            return false;
        }
        return true;
    }

    /**
     * Redirect to dashboard if authenticated
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = '/';
            return true;
        }
        return false;
    }
}

// Create global auth manager instance
const authManager = new AuthManager();
