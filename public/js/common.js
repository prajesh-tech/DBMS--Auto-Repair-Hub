// All user-controlled text interpolated into trusted markup passes through this helper.
window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

window.trapDialogFocus = (dialog, onEscape) => {
  const previous = document.activeElement;
  const background = [...document.body.children].filter(element => element !== dialog && !['SCRIPT', 'LINK'].includes(element.tagName));
  const oldInert = background.map(element => element.inert);
  background.forEach(element => { element.inert = true; });
  const focusable = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
  const keydown = event => {
    if (event.key === 'Escape') { event.preventDefault(); onEscape(); }
    if (event.key !== 'Tab') return;
    const items = focusable();
    if (!items.length) { event.preventDefault(); dialog.focus(); return; }
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };
  dialog.tabIndex = -1;
  dialog.addEventListener('keydown', keydown);
  (focusable()[0] || dialog).focus();
  return () => {
    dialog.removeEventListener('keydown', keydown);
    background.forEach((element, index) => { element.inert = oldInert[index]; });
    if (previous && previous.isConnected) previous.focus();
  };
};

window.listState = (id, state, message, retry) => {
  const body = document.getElementById(id);
  if (!body) return;
  body.replaceChildren();
  const row = body.insertRow();
  const cell = row.insertCell();
  cell.colSpan = body.closest('table').querySelectorAll('thead th').length;
  cell.className = 'list-state';
  cell.setAttribute('role', 'status');
  cell.textContent = message;
  if (state === 'error' && retry) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-secondary'; button.textContent = 'Retry';
    button.addEventListener('click', retry); cell.append(' ', button);
  }
};
