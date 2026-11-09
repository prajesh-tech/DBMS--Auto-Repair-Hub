
const actions = {

};

    document.addEventListener('DOMContentLoaded', () => {
        API.get('/api/auth/me').then(res => {
            API.setUser(res.user);
            if (res.user.must_change_password) API.showChangePasswordModal();
            else location.replace(res.user.role === 'mechanic' ? 'services.html' : 'index.html');
        }).catch(() => {});

        const toggleBtn = document.getElementById('togglePasswordBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const pwdInput = document.getElementById('passwordField');
                const eyeIcon = document.getElementById('eyeIcon');
                if (pwdInput.type === 'password') {
                    pwdInput.type = 'text';
                    eyeIcon.textContent = 'visibility_off';
                } else {
                    pwdInput.type = 'password';
                    eyeIcon.textContent = 'visibility';
                }
            });
        }

        const form = document.getElementById('authForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const btnText = document.getElementById('btnText');
            const originalText = btnText.textContent;
            const username = document.getElementById('userField').value.trim();
            const password = document.getElementById('passwordField').value;

            if (!username || !password) {
                Toast.error('Please enter username and password');
                return;
            }

            try {
                btn.disabled = true;
                btnText.textContent = 'Signing in...';
                btn.classList.add('opacity-85');

                const res = await API.post('/api/auth/login', { username, password });

                btnText.textContent = 'Signed in';
                if (res.user) {
                    API.setUser(res.user);
                }

                if (res.user && res.user.must_change_password) {
                    Toast.info('Please change your password to continue');
                    API.showChangePasswordModal();
                    btn.disabled = false;
                    btnText.textContent = originalText;
                    return;
                }

                Toast.success('Login successful');
                setTimeout(() => {
                    window.location.href = API.getUser()?.role === 'mechanic' ? 'services.html' : 'index.html';
                }, 400);
            } catch (err) {
                let msg = err.message || 'Authentication failed';
                if (msg.includes('ECONNREFUSED') || msg.includes('connect')) {
                    msg = 'Database offline: start MariaDB via "sudo service mariadb start"';
                }
                Toast.error(msg);
                btnText.textContent = originalText;
                btn.disabled = false;
                btn.classList.remove('opacity-85');
            }
        });
    });
