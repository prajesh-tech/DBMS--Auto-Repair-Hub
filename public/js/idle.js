(() => {
  const timeout = 30 * 60 * 1000;
  const warning = 2 * 60 * 1000;
  let lastActivity = Date.now();
  let warningTimer;
  let logoutTimer;
  let countdown;
  let releaseFocus;
  let overlay;

  function close() {
    clearInterval(countdown);
    if (releaseFocus) { releaseFocus(); releaseFocus = null; }
    if (overlay) { overlay.remove(); overlay = null; }
  }
  function logout() { close(); API.logout(); }
  function reset() {
    lastActivity = Date.now();
    clearTimeout(warningTimer); clearTimeout(logoutTimer);
    warningTimer = setTimeout(showWarning, timeout - warning);
    logoutTimer = setTimeout(logout, timeout);
  }
  function showWarning() {
    overlay = document.createElement('div');
    overlay.id = 'idleModalOverlay'; overlay.className = 'modal-overlay active';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'idleTitle');
    overlay.innerHTML = '<div class="modal-dialog"><h2 id="idleTitle">Session Timeout Warning</h2><p>You have been inactive. You will be logged out in:</p><p id="idleCountdownDisplay" class="idle-countdown" role="timer"></p><div class="modal-footer"><button id="stayLoggedInBtn" class="btn">Stay Logged In</button><button id="logoutNowBtn" class="btn btn-secondary">Log Out Now</button></div></div>';
    document.body.appendChild(overlay);
    const deadline = lastActivity + timeout;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      overlay.querySelector('#idleCountdownDisplay').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      if (!seconds) logout();
    };
    update(); countdown = setInterval(update, 1000);
    overlay.querySelector('#stayLoggedInBtn').addEventListener('click', async () => {
      try { await API.get('/api/auth/me'); close(); reset(); } catch (err) { logout(); }
    });
    overlay.querySelector('#logoutNowBtn').addEventListener('click', logout);
    releaseFocus = trapDialogFocus(overlay, logout);
  }
  ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(event => {
    window.addEventListener(event, () => {
      if (!overlay && Date.now() - lastActivity > 3000) reset();
    }, { passive: true });
  });
  document.addEventListener('DOMContentLoaded', reset);
})();
