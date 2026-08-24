const Modal = {
    overlay: null,

    init() {
        if (!document.getElementById('globalModalOverlay')) {
            const div = document.createElement('div');
            div.id = 'globalModalOverlay';
            div.className = 'modal-overlay';
            div.setAttribute('role', 'dialog');
            div.setAttribute('aria-modal', 'true');
            div.setAttribute('aria-labelledby', 'globalModalTitle');

            div.innerHTML = `
                <div class="modal-dialog">
                    <div class="card-header" style="margin-bottom:16px;">
                        <h3 class="card-title" id="globalModalTitle">Modal</h3>
                        <button class="btn btn-outline btn-sm" style="padding:2px 8px;" aria-label="Close dialog" onclick="Modal.close()">✕</button>
                    </div>
                    <div class="modal-body" id="globalModalBody" style="margin-bottom:20px;"></div>
                    <div class="modal-footer" id="globalModalFooter" style="display:flex; justify-content:flex-end; gap:10px;"></div>
                </div>
            `;
            document.body.appendChild(div);
            this.overlay = div;

            // Keyboard Escape key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay && this.overlay.classList.contains('active')) {
                    this.close();
                }
            });
        } else {
            this.overlay = document.getElementById('globalModalOverlay');
        }
    },

    open({ title, bodyHTML, onConfirm, confirmText = 'Save', cancelText = 'Cancel' }) {
        this.init();
        document.getElementById('globalModalTitle').innerText = title;
        document.getElementById('globalModalBody').innerHTML = bodyHTML;

        const footer = document.getElementById('globalModalFooter');
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="Modal.close()">${cancelText}</button>
            <button class="btn" id="modalConfirmBtn">${confirmText}</button>
        `;

        document.getElementById('modalConfirmBtn').onclick = async () => {
            if (onConfirm) {
                try {
                    await onConfirm();
                } catch (err) {
                    console.error('[Modal Error]:', err);
                }
            }
        };

        // Attach Enter key handler to modal body inputs
        const bodyInputs = document.getElementById('globalModalBody').querySelectorAll('input, select');
        bodyInputs.forEach(input => {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('modalConfirmBtn').click();
                }
            };
        });

        this.overlay.classList.add('active');
    },

    confirm({ title = 'Confirm Action', message, onConfirm }) {
        this.open({
            title,
            bodyHTML: `<p style="color:var(--text-secondary); font-size:0.95rem;">${message}</p>`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    if (onConfirm) await onConfirm();
                } finally {
                    this.close();
                }
            }
        });
    },

    close() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }
};

window.Modal = Modal;
