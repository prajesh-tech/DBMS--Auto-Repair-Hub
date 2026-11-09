const Modal = {
  overlay: null,
  open({ title, bodyHTML, onConfirm, confirmText = 'Save', cancelText = 'Cancel', onCancel }) {
    this.close();
    this.onCancel = onCancel;
    const overlay = document.createElement('div');
    overlay.id = 'globalModalOverlay';
    overlay.className = 'modal-overlay active';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'globalModalTitle');
    overlay.innerHTML = `<div class="modal-dialog"><div class="card-header"><h3 id="globalModalTitle"></h3><button class="btn btn-secondary" data-modal-close aria-label="Close dialog">✕</button></div><div class="modal-body" id="globalModalBody"></div><div class="modal-footer"><button class="btn btn-secondary" data-modal-close>${escapeHTML(cancelText)}</button><button class="btn" id="modalConfirmBtn">${escapeHTML(confirmText)}</button></div></div>`;
    overlay.querySelector('#globalModalTitle').textContent = title;
    overlay.querySelector('#globalModalBody').innerHTML = bodyHTML;
    document.body.appendChild(overlay);
    this.overlay = overlay;
    const cancel = () => { const callback = this.onCancel; this.close(); if (callback) callback(); };
    overlay.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', cancel));
    const confirm = overlay.querySelector('#modalConfirmBtn');
    confirm.addEventListener('click', async () => {
      confirm.disabled = true;
      try { if (onConfirm) await onConfirm(); } catch (err) { Toast.error(err.message); }
      finally { confirm.disabled = false; }
    });
    overlay.querySelectorAll('input, select').forEach(input => input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); confirm.click(); }
    }));
    this.releaseFocus = trapDialogFocus(overlay, cancel);
  },
  confirm({ title = 'Confirm Action', message, onConfirm }) {
    this.open({ title, bodyHTML: `<p>${escapeHTML(message)}</p>`, confirmText: 'Delete', onConfirm: async () => {
      if (onConfirm) await onConfirm();
      this.close();
    } });
  },
  close() {
    if (this.releaseFocus) { this.releaseFocus(); this.releaseFocus = null; }
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
  }
};
window.Modal = Modal;
