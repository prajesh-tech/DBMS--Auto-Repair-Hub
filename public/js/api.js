const API = {
    user: null,

    getCookie(name) {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    },

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
            await this.post('/api/auth/logout', {});
        } catch (e) {}
        this.clearUser();
        window.location.href = 'login.html';
    },

    async requireAuth() {
        if (window.location.pathname.endsWith('login.html')) return null;
        try {
            const res = await this.get('/api/auth/me');
            if (res && res.user) {
                this.setUser(res.user);
                if (res.user.must_change_password) {
                    this.showChangePasswordModal();
                }
                this.applyRoleRestrictions(res.user);
                return res.user;
            }
        } catch (err) {
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
        }
        return null;
    },

    showChangePasswordModal() {
        if (document.getElementById('changePasswordOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'changePasswordOverlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'changePasswordTitle');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
        overlay.innerHTML = `
            <div style="background:var(--surface-container-lowest,#fff);color:var(--on-surface,#1c1b1b);border-radius:12px;padding:1.5rem;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.2);">
                <h2 id="changePasswordTitle" style="margin:0 0 0.5rem;font-size:1.25rem;">Change your password</h2>
                <p style="margin:0 0 1rem;color:var(--on-surface-variant,#444);font-size:0.9rem;">You must set a new password before continuing.</p>
                <label for="cpCurrent" style="display:block;font-size:0.75rem;margin-bottom:0.25rem;">Current password</label>
                <input id="cpCurrent" type="password" autocomplete="current-password" style="width:100%;margin-bottom:0.75rem;padding:0.6rem;border-radius:8px;border:1px solid var(--outline-variant,#c4c7c8);"/>
                <label for="cpNew" style="display:block;font-size:0.75rem;margin-bottom:0.25rem;">New password</label>
                <input id="cpNew" type="password" autocomplete="new-password" style="width:100%;margin-bottom:0.75rem;padding:0.6rem;border-radius:8px;border:1px solid var(--outline-variant,#c4c7c8);"/>
                <label for="cpConfirm" style="display:block;font-size:0.75rem;margin-bottom:0.25rem;">Confirm new password</label>
                <input id="cpConfirm" type="password" autocomplete="new-password" style="width:100%;margin-bottom:1rem;padding:0.6rem;border-radius:8px;border:1px solid var(--outline-variant,#c4c7c8);"/>
                <p id="cpError" style="display:none;color:var(--error,#ba1a1a);font-size:0.85rem;margin:0 0 0.75rem;"></p>
                <button id="cpSubmit" type="button" style="width:100%;padding:0.75rem;border:none;border-radius:8px;background:var(--secondary,#0050d7);color:#fff;font-weight:600;cursor:pointer;">Update password</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const submit = overlay.querySelector('#cpSubmit');
        submit.addEventListener('click', async () => {
            const currentPassword = overlay.querySelector('#cpCurrent').value;
            const newPassword = overlay.querySelector('#cpNew').value;
            const confirmPassword = overlay.querySelector('#cpConfirm').value;
            const errEl = overlay.querySelector('#cpError');
            errEl.style.display = 'none';

            if (!currentPassword || !newPassword) {
                errEl.textContent = 'Both current and new passwords are required.';
                errEl.style.display = 'block';
                return;
            }
            if (newPassword !== confirmPassword) {
                errEl.textContent = 'New password and confirmation do not match.';
                errEl.style.display = 'block';
                return;
            }

            try {
                submit.disabled = true;
                const res = await this.post('/api/auth/change-password', { currentPassword, newPassword });
                if (res.user) this.setUser(res.user);
                overlay.remove();
                if (window.Toast) Toast.success('Password updated');
            } catch (err) {
                errEl.textContent = err.message || 'Could not change password';
                errEl.style.display = 'block';
                submit.disabled = false;
            }
        });
    },

    async request(endpoint, options = {}, isRetry = false) {
        const method = (options.method || 'GET').toUpperCase();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const csrf = this.getCookie('csrf_token');
            if (csrf) headers['X-CSRF-Token'] = csrf;
        }

        const fetchOptions = {
            ...options,
            method,
            headers,
            credentials: 'same-origin'
        };

        try {
            const res = await fetch(endpoint, fetchOptions);

            if (res.status === 401 && !isRetry && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/change-password')) {
                try {
                    const refreshHeaders = { 'Content-Type': 'application/json' };
                    const csrf = this.getCookie('csrf_token');
                    if (csrf) refreshHeaders['X-CSRF-Token'] = csrf;
                    const refreshRes = await fetch('/api/auth/refresh', {
                        method: 'POST',
                        headers: refreshHeaders,
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
    post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body || {}) }); },
    put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body || {}) }); },
    delete(url) { return this.request(url, { method: 'DELETE' }); },

    applyRoleRestrictions(user) {
        const currentUser = user || this.getUser();
        if (!currentUser) return;

        const role = currentUser.role || 'staff';
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const badge = document.getElementById('userBadge');
        if (badge) {
            const roleLabels = { admin: 'Admin', staff: 'Staff', mechanic: 'Mechanic' };
            badge.innerText = `${roleLabels[role] || role} (${currentUser.username})`;
        }

        if (role === 'mechanic') {
            if (['employee.html', 'parts.html', 'customer.html', 'cars.html', 'analytics.html'].includes(currentPage)) {
                window.location.href = 'services.html';
                return;
            }
            document.querySelectorAll('a[href="employee.html"], a[href="parts.html"], a[href="customer.html"], a[href="cars.html"], a[href="analytics.html"]').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.menu-card[href="employee.html"], .menu-card[href="parts.html"], .menu-card[href="customer.html"], .menu-card[href="cars.html"], .menu-card[href="analytics.html"]').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.btn-danger, .btn-delete, [data-role="admin"], [data-role="staff"]').forEach(el => {
                if (!el.classList.contains('mechanic-allowed')) el.style.display = 'none';
            });
            document.querySelectorAll('.salary-col').forEach(el => el.style.display = 'none');
        } else if (role === 'staff') {
            if (currentPage === 'employee.html') {
                window.location.href = 'index.html';
                return;
            }
            document.querySelectorAll('a[href="employee.html"], .menu-card[href="employee.html"]').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.btn-delete, [data-role="admin-only"], .salary-col').forEach(el => el.style.display = 'none');
        }
    },

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

    updateThemeToggleUI(theme) {
        document.querySelectorAll('#themeToggleBtn, .theme-toggle-btn').forEach(btn => {
            const iconSpan = btn.querySelector('.material-symbols-outlined');
            if (iconSpan) {
                iconSpan.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
            } else {
                btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
            }
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        });
    },

    initTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.documentElement.classList.toggle('dark', currentTheme === 'dark');
        this.updateThemeToggleUI(currentTheme);
        this.initNav();
        const user = this.getUser();
        if (user) this.applyRoleRestrictions(user);
    },

    toggleTheme() {
        const current = localStorage.getItem('theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
        localStorage.setItem('theme', next);
        this.updateThemeToggleUI(next);
    }
};

window.API = API;
window.toggleMobileNav = () => {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) {
        drawer.classList.toggle('hidden');
    }
    const nav = document.querySelector('.nav-links');
    if (nav) nav.classList.toggle('nav-open');
};
document.addEventListener('click', (e) => {
    const nav = document.querySelector('.nav-links');
    const btn = document.getElementById('hamburgerBtn');
    if (nav && nav.classList.contains('nav-open')) {
        if (!nav.contains(e.target) && (!btn || !btn.contains(e.target))) {
            nav.classList.remove('nav-open');
        }
    }
});
window.debounce = (fn, delay = 300) => {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};
document.addEventListener('DOMContentLoaded', () => API.initTheme());
