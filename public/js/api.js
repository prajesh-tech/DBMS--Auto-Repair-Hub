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
        try {
            const res = await this.get('/api/auth/me');
            this.setUser(res.user);
            const user = res.user;
            const page = location.pathname.split('/').pop() || 'index.html';
            if (user.must_change_password) { location.replace('login.html'); return null; }
            if (user.role === 'mechanic' && page !== 'services.html') { location.replace('services.html'); return null; }
            if (user.role !== 'admin' && page === 'employee.html') { location.replace('index.html'); return null; }
            return user;
        } catch (err) { location.replace('login.html'); return null; }
    },

    showChangePasswordModal() {
        if (document.getElementById('changePasswordOverlay')) return;
        Modal.open({
            title: 'Change your password',
            bodyHTML: `
                <div class="password-change-intro">
                    <span class="password-change-icon material-symbols-outlined" aria-hidden="true">lock</span>
                    <div>
                        <p class="password-change-eyebrow">Account security</p>
                        <p id="passwordChangeDescription">Set a new password to finish signing in.</p>
                    </div>
                </div>
                <div class="password-change-field">
                    <label for="cpCurrent">Current password</label>
                    <div class="password-change-input"><input id="cpCurrent" type="password" autocomplete="current-password" placeholder="Enter your current password" aria-describedby="cpCurrentHint" required><button type="button" class="password-visibility" data-password-toggle="cpCurrent" aria-controls="cpCurrent" aria-label="Show current password" aria-pressed="false"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button></div>
                    <p id="cpCurrentHint" class="password-change-hint">Use the password you just signed in with.</p>
                </div>
                <div class="password-change-field">
                    <label for="cpNew">New password</label>
                    <div class="password-change-input"><input id="cpNew" type="password" autocomplete="new-password" placeholder="Create a new password" aria-describedby="cpPasswordRules" minlength="8" required><button type="button" class="password-visibility" data-password-toggle="cpNew" aria-controls="cpNew" aria-label="Show new password" aria-pressed="false"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button></div>
                    <p id="cpPasswordRules" class="password-change-hint">Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.</p>
                </div>
                <div class="password-change-field">
                    <label for="cpConfirm">Confirm new password</label>
                    <div class="password-change-input"><input id="cpConfirm" type="password" autocomplete="new-password" placeholder="Re-enter your new password" required><button type="button" class="password-visibility" data-password-toggle="cpConfirm" aria-controls="cpConfirm" aria-label="Show confirmation password" aria-pressed="false"><span class="material-symbols-outlined" aria-hidden="true">visibility</span></button></div>
                </div>
                <p id="cpError" class="password-change-error" role="alert"></p>`,
            confirmText: 'Update password', cancelText: 'Log out',
            onCancel: () => this.logout(),
            onConfirm: async () => {
                const currentPassword = document.getElementById('cpCurrent').value;
                const newPassword = document.getElementById('cpNew').value;
                const error = document.getElementById('cpError');
                if (newPassword !== document.getElementById('cpConfirm').value) {
                    error.textContent = 'New passwords do not match.'; return;
                }
                try {
                    const res = await this.post('/api/auth/change-password', { currentPassword, newPassword });
                    this.setUser(res.user); Modal.close();
                    location.replace(res.user.role === 'mechanic' ? 'services.html' : 'index.html');
                } catch (err) { error.textContent = err.message; }
            }
        });
        Modal.overlay.id = 'changePasswordOverlay';
        Modal.overlay.classList.add('password-change-modal');
        Modal.overlay.setAttribute('aria-describedby', 'passwordChangeDescription');
        Modal.overlay.querySelector('.card-header [data-modal-close]').setAttribute('aria-label', 'Log out and close dialog');
        Modal.overlay.querySelectorAll('[data-password-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                const input = document.getElementById(button.dataset.passwordToggle);
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                button.setAttribute('aria-pressed', String(show));
                button.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${input.labels[0].textContent.toLowerCase()}`);
                button.querySelector('.material-symbols-outlined').textContent = show ? 'visibility_off' : 'visibility';
            });
        });
        Modal.overlay.querySelector('#cpCurrent').focus();
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
                    if (!this.refreshPromise) {
                        this.refreshPromise = fetch('/api/auth/refresh', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.getCookie('csrf_token') || '' },
                            credentials: 'same-origin'
                        }).then(async response => {
                            if (!response.ok) throw new Error('Session expired');
                            const data = await response.json();
                            if (data.user) this.setUser(data.user);
                        }).finally(() => { this.refreshPromise = null; });
                    }
                    await this.refreshPromise;
                    return await this.request(endpoint, options, true);
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

    updateThemeToggleUI(theme) {
        document.querySelectorAll('#themeToggleBtn, .theme-toggle-btn').forEach(btn => {
            const iconSpan = btn.querySelector('.material-symbols-outlined');
            if (iconSpan) {
                iconSpan.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
            } else {
                btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
            }
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            btn.setAttribute('aria-pressed', String(theme === 'dark'));
        });
    },

    initTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        document.documentElement.classList.toggle('dark', currentTheme === 'dark');
        this.updateThemeToggleUI(currentTheme);

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
