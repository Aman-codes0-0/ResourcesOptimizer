class App {
    constructor() {
        this.socket = null;
        this.user = null;
        this.currentPage = 'dashboard';
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        // Check authentication
        if (!authManager.isAuthenticated()) {
            window.location.href = 'pages/login.html';
            return;
        }

        try {
            this.user = await authManager.getCurrentUser();
            this.updateUserProfile();
            this.initSocket();
            this.initNavigation();
            this.initTheme();
            this.handleRoute();

            this.initialized = true;
            console.log('App initialized');
        } catch (error) {
            console.error('Initialization error:', error);
            authManager.logout();
            window.location.href = 'pages/login.html';
        }
    }

    initSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });

        // Global event listeners
        this.socket.on('notification', (data) => {
            this.showNotification(data);
        });
    }

    updateConnectionStatus(connected) {
        const dot = document.getElementById('wsStatusDot');
        const text = document.getElementById('wsStatusText');

        if (connected) {
            dot.style.backgroundColor = 'var(--success-color)';
            text.textContent = 'Connected';
        } else {
            dot.style.backgroundColor = 'var(--danger-color)';
            text.textContent = 'Disconnected';
        }
    }

    initNavigation() {
        // Hash change listener
        window.addEventListener('hashchange', () => this.handleRoute());

        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Remove active class from all
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                // Add active to clicked
                e.currentTarget.classList.add('active');
            });
        });

        // Global search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.performGlobalSearch(e.target.value);
            }, 500));
        }

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authManager.logout();
            window.location.href = 'pages/login.html';
        });

        // Notifications
        const notifBtn = document.getElementById('notificationBtn');
        const notifPanel = document.getElementById('notificationPanel');
        const closeNotif = document.getElementById('closeNotifications');

        notifBtn.addEventListener('click', () => {
            notifPanel.classList.toggle('show');
            this.loadNotifications();
        });

        closeNotif.addEventListener('click', () => {
            notifPanel.classList.remove('show');
        });
    }

    initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';

        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle span');
        icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
    }

    updateUserProfile() {
        if (!this.user) return;

        document.getElementById('userName').textContent = this.user.full_name;
        document.getElementById('userRole').textContent = this.user.role;
        document.getElementById('userAvatar').textContent = this.user.full_name.charAt(0).toUpperCase();
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.currentPage = hash;

        // Update container
        const container = document.getElementById('pageContent');
        container.innerHTML = '<div class="loading-spinner"></div>';

        // Load content based on route
        try {
            switch (hash) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'resources':
                    await this.loadResources();
                    break;
                case 'projects':
                    await this.loadProjects();
                    break;
                case 'allocations':
                    await this.loadAllocations();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'ai-insights':
                    await this.loadAIInsights();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
                default:
                    container.innerHTML = '<h3>Page not found</h3>';
            }
        } catch (error) {
            console.error('Route error:', error);
            container.innerHTML = `<div class="error">Failed to load content: ${error.message}</div>`;
        }
    }

    // Page Loaders
    async loadDashboard() {
        if (window.dashboardManager) {
            await window.dashboardManager.render();
        } else {
            console.error('Dashboard manager not found');
        }
    }

    async loadResources() {
        if (window.resourceManager) {
            await window.resourceManager.render();
        } else {
            document.getElementById('pageContent').innerHTML = '<div class="error">Resource Manager module not loaded</div>';
        }
    }

    async loadProjects() {
        if (window.projectManager) {
            await window.projectManager.render();
        } else {
            document.getElementById('pageContent').innerHTML = '<div class="error">Project Manager module not loaded</div>';
        }
    }

    async loadAllocations() {
        if (window.allocationManager) {
            await window.allocationManager.render();
        } else {
            document.getElementById('pageContent').innerHTML = '<div class="error">Allocation Manager module not loaded</div>';
        }
    }

    async loadAnalytics() {
        document.getElementById('pageContent').innerHTML = `
            <h2>Advanced Analytics</h2>
            <div class="chart-container"></div>
        `;
    }

    async loadAIInsights() {
        document.getElementById('pageContent').innerHTML = `
            <h2>AI Insights & Recommendations</h2>
            <div id="aiContent"></div>
        `;
    }

    async loadReports() {
        document.getElementById('pageContent').innerHTML = `
            <h2>Reports Center</h2>
            <div id="reportControls"></div>
        `;
    }

    // Utilities
    debounce(func, wait) {
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

    showNotification(data) {
        // Show toast
        const toast = document.createElement('div');
        toast.className = `toast ${data.type || 'info'}`;
        toast.textContent = data.message;
        document.getElementById('toastContainer').appendChild(toast);

        setTimeout(() => toast.remove(), 5000);

        // Update badge
        const badge = document.getElementById('notificationBadge');
        const count = parseInt(badge.textContent || '0') + 1;
        badge.textContent = count;
        badge.style.display = 'block';
    }

    async loadNotifications() {
        try {
            const response = await authManager.apiRequest('/api/notifications');
            const notifications = await response.json();

            const list = document.getElementById('notificationList');
            list.innerHTML = notifications.map(n => `
                <div class="notification-item ${n.read ? '' : 'unread'}">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-msg">${n.message}</div>
                    <div class="notification-time">${new Date(n.created_at).toLocaleString()}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load notifications', error);
        }
    }
}

// Initialize App
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
