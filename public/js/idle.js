(function () {
    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes total
    const WARNING_MARGIN_MS = 2 * 60 * 1000; // Warning shown 2 mins before logout (at 28 mins)
    const WARNING_TIME_MS = IDLE_TIMEOUT_MS - WARNING_MARGIN_MS;

    let lastActivityTime = Date.now();
    let warningTimer = null;
    let logoutTimer = null;
    let countdownInterval = null;
    let isModalOpen = false;

    function resetIdleTimer() {
        if (isModalOpen) return; // Do not hide modal automatically if already prompting user

        lastActivityTime = Date.now();
        clearTimeout(warningTimer);
        clearTimeout(logoutTimer);
        clearInterval(countdownInterval);

        warningTimer = setTimeout(showWarningModal, WARNING_TIME_MS);
        logoutTimer = setTimeout(performLogout, IDLE_TIMEOUT_MS);
    }

    function showWarningModal() {
        if (window.location.pathname.endsWith('login.html')) return;
        isModalOpen = true;

        let remainingSeconds = Math.floor(WARNING_MARGIN_MS / 1000);

        const modalHtml = `
            <div id="idleModalOverlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
                <div style="background:var(--card-bg, #ffffff); border-radius:16px; padding:32px; width:90%; max-width:420px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.4); border:1px solid var(--border-color, #e5e7eb);">
                    <div style="font-size:3rem; margin-bottom:12px;">⏳</div>
                    <h3 style="margin-top:0; font-size:1.4rem; color:var(--text-primary, #111827);">Session Timeout Warning</h3>
                    <p style="color:var(--text-secondary, #4b5563); margin-bottom:20px;">
                        You have been inactive. For your security, you will be logged out in:
                    </p>
                    <div id="idleCountdownDisplay" style="font-size:2.2rem; font-weight:800; color:var(--primary, #c9a227); margin-bottom:24px; font-variant-numeric:tabular-nums;">
                        02:00
                    </div>
                    <div style="display:flex; gap:12px; justify-content:center;">
                        <button id="stayLoggedInBtn" class="btn" style="flex:1; padding:12px; background:var(--primary, #c9a227); color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
                            Stay Logged In
                        </button>
                        <button id="logoutNowBtn" class="btn btn-secondary" style="flex:1; padding:12px; background:#ef4444; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
                            Logout Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('idleModalOverlay');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const updateCountdown = () => {
            const mins = Math.floor(remainingSeconds / 60);
            const secs = remainingSeconds % 60;
            const display = document.getElementById('idleCountdownDisplay');
            if (display) {
                display.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }

            if (remainingSeconds <= 0) {
                clearInterval(countdownInterval);
                performLogout();
            }
            remainingSeconds--;
        };

updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);

        document.getElementById('stayLoggedInBtn').addEventListener('click', async () => {
            closeWarningModal();
            try {
                if (window.API && typeof window.API.get === 'function') {
                    await window.API.get('/api/auth/me');
                }
            } catch (e) {}
            resetIdleTimer();
        });

        document.getElementById('logoutNowBtn').addEventListener('click', () => {
            closeWarningModal();
            performLogout();
        });
    }

    function closeWarningModal() {
        isModalOpen = false;
        clearInterval(countdownInterval);
        const modal = document.getElementById('idleModalOverlay');
        if (modal) modal.remove();
    }

    function performLogout() {
        closeWarningModal();
        if (window.API && typeof window.API.logout === 'function') {
            window.API.logout();
        } else {
            window.location.href = 'login.html';
        }
    }

    // Attach User Activity Listeners
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach(evt => {
        window.addEventListener(evt, () => {
            if (!isModalOpen) {
                // Throttle reset calls to max once every 3 seconds
                if (Date.now() - lastActivityTime > 3000) {
                    resetIdleTimer();
                }
            }
        }, { passive: true });
    });

    // Initialize timer on DOM Load
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.location.pathname.endsWith('login.html')) {
            resetIdleTimer();
        }
    });
})();
