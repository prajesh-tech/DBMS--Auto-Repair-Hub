const API = {
    user: null,

    getUser() {
        if (this.user) return this.user;
        const stored = sessionStorage.getItem('user');
        if (stored) {
            try { this.user = JSON.parse(stored); } catch (e) {}
        }
        return this.user;
    },

    setUser(user) {
        this.user = user;
        if (user) {
            sessionStorage.setItem('user', JSON.stringify(user));
        } else {
            sessionStorage.removeItem('user');
        }
    },

    clearUser() {
        this.user = null;
        sessionStorage.removeItem('user');
    },

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) {}
        this.clearUser();
        window.location.href = 'login.html';
    },

    async requireAuth() {
        if (window.location.pathname.endsWith('login.html')) return;
        try {
            const res = await this.get('/api/auth/me');
            if (res && res.user) {
                this.setUser(res.user);
                this.applyRoleRestrictions(res.user);
            }
        } catch (err) {
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
        }
    },

    async request(endpoint, options = {}, isRetry = false) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const fetchOptions = {
            ...options,
            headers,
            credentials: 'same-origin' // Ensures HttpOnly cookies are sent automatically
        };

        try {
            const res = await fetch(endpoint, fetchOptions);

            if (res.status === 401 && !isRetry && !endpoint.includes('/api/auth/login')) {
                // Attempt automatic token refresh
                try {
                    const refreshRes = await fetch('/api/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin'
                    });
                    if (refreshRes.ok) {
                        const refreshData = await refreshRes.json();
                        if (refreshData.user) this.setUser(refreshData.user);
                        return await this.request(endpoint, options, true);
                    }
                } catch (refreshErr) {
                    console.error('Refresh token failed:', refreshErr.message);
                }

                this.clearUser();
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'login.html';
                }
                throw new Error('Unauthorized or session expired');
            }

            if (res.status === 403) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Forbidden: Insufficient privileges');
            }

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'API Request failed');
            }
            return data;
        } catch (err) {
            if (!endpoint.includes('/api/auth/me')) {
                console.error('[API Error]:', err.message);
            }
            throw err;
        }
    },

    get(url) { return this.request(url, { method: 'GET' }); },
    post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
    put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
    delete(url) { return this.request(url, { method: 'DELETE' }); },

    // Role-Based Access Control & Dynamic UI Rendering
    applyRoleRestrictions(user) {
        const currentUser = user || this.getUser();
        if (!currentUser) return;

        const role = currentUser.role || 'staff';
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Update User Badge in Navbar
        const badge = document.getElementById('userBadge');
        if (badge) {
            const roleLabels = { admin: '👑 Admin', staff: '💼 Staff', mechanic: '👨‍🔧 Mechanic' };
            badge.innerText = `${roleLabels[role] || role} (${currentUser.username})`;
        }

        // Page Level Route Restrictions
        if (role === 'mechanic') {
            // Mechanics cannot view Employees, Parts, Customers, Cars, or Analytics directly
            if (['employee.html', 'parts.html', 'customer.html', 'cars.html', 'analytics.html'].includes(currentPage)) {
                window.location.href = 'services.html';
                return;
            }
            // Hide navigation links for restricted tabs
            document.querySelectorAll('a[href="employee.html"], a[href="parts.html"], a[href="customer.html"], a[href="cars.html"], a[href="analytics.html"]').forEach(el => el.style.display = 'none');
            // Hide menu cards on dashboard
            document.querySelectorAll('.menu-card[href="employee.html"], .menu-card[href="parts.html"], .menu-card[href="customer.html"], .menu-card[href="cars.html"], .menu-card[href="analytics.html"]').forEach(el => el.style.display = 'none');
            // Hide Admin/Staff specific action buttons
            document.querySelectorAll('.btn-danger, .btn-delete, [data-role="admin"], [data-role="staff"]').forEach(el => {
                if (!el.classList.contains('mechanic-allowed')) el.style.display = 'none';
            });
            // Hide Salary columns
            document.querySelectorAll('.salary-col').forEach(el => el.style.display = 'none');
        } else if (role === 'staff') {
            // Staff cannot access Employee directory or salary info
            if (currentPage === 'employee.html') {
                window.location.href = 'index.html';
                return;
            }
            document.querySelectorAll('a[href="employee.html"], .menu-card[href="employee.html"]').forEach(el => el.style.display = 'none');
            // Hide delete buttons and salary columns for staff
            document.querySelectorAll('.btn-delete, [data-role="admin-only"], .salary-col').forEach(el => el.style.display = 'none');
        }
    },

    // Navigation & Active Link Management
    initNav() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || (currentPath === '' && href === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    // Theme Management
    initTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.innerHTML = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
        }
        this.initNav();
        const user = this.getUser();
        if (user) this.applyRoleRestrictions(user);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.innerHTML = next === 'dark' ? '☀️ Light' : '🌙 Dark';
        }
    }
};

window.API = API;
window.debounce = (fn, delay = 300) => {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};
document.addEventListener('DOMContentLoaded', () => API.initTheme());
