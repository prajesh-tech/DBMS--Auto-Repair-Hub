(async () => {
  const user = await API.requireAuth();
  if (!user) return;
  Layout.render(user);
  document.body.classList.add('auth-ready');

const actions = {
  action1: function(event) { API.toggleTheme() },
  action2: function(event) { logout() },
  action3: function(event) { toggleMobileNav() },
  action4: function(event) { document.getElementById('customer-search-input').value = this.value; debounceSearch(); },
  action5: function(event) { toggleCollapse(); document.getElementById('input-name').focus(); },
  action6: function(event) { event.stopPropagation() },
  action7: function(event) { window.print() },
  action8: function(event) { handleCustomerSubmit(event) },
  action9: function(event) { debounceSearch() },
  action10: function(event) { loadCustomers(1) },
  action11: function(event) { changePage(-1) },
  action12: function(event) { changePage(1) },
  action14: function(event) { openEditModal(Number(this.dataset.arg0)) },
  action15: function(event) { confirmDelete(Number(this.dataset.arg0)) }
};
document.addEventListener('click', event => {
  const element = event.target.closest('[data-click]');
  if (!element) return;
  if ('click' === 'submit') event.preventDefault();
  const action = actions[element.dataset.click];
  if (action) action.call(element, event);
});
document.addEventListener('input', event => {
  const element = event.target.closest('[data-input]');
  if (!element) return;
  if ('input' === 'submit') event.preventDefault();
  const action = actions[element.dataset.input];
  if (action) action.call(element, event);
});
document.addEventListener('submit', event => {
  const element = event.target.closest('[data-submit]');
  if (!element) return;
  if ('submit' === 'submit') event.preventDefault();
  const action = actions[element.dataset.submit];
  if (action) action.call(element, event);
});



let currentPage = 1;
let totalPages = 1;
let customerDataMap = {};
let isCollapsed = false;

// Quick collapse and expand interaction for Registration panel
const collapseBtn = document.getElementById('collapse-toggle-btn');
const toggleRegisterBtn = document.getElementById('toggle-register-btn');
const regForm = document.getElementById('customer-form');
const collapseIcon = document.getElementById('collapse-icon');
const regPanel = document.getElementById('quick-register-panel');

function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
        regForm.classList.add('hidden');
        collapseIcon.textContent = 'expand_more';
    } else {
        regForm.classList.remove('hidden');
        collapseIcon.textContent = 'expand_less';
    }
}

if (collapseBtn) collapseBtn.addEventListener('click', toggleCollapse);
if (toggleRegisterBtn) toggleRegisterBtn.addEventListener('click', () => {
    if (isCollapsed) toggleCollapse();
    document.getElementById('input-name').focus();
    regPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

async function loadCustomers(page = 1) {
    currentPage = page;
    const search = document.getElementById('customer-search-input').value.trim();

    listState('customers-table-body', 'loading', 'Loading records…');
    try {
        const res = await API.get(`/api/customers?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
        const tbody = document.getElementById('customers-table-body');

        totalPages = res.pagination.totalPages || 1;
        document.getElementById('paginationInfo').innerText = `Showing ${res.data.length} of ${res.pagination.total} registered accounts`;
        document.getElementById('pageDisplay').innerText = res.pagination.page;
        document.getElementById('activeCountBadge').innerText = `${res.pagination.total || res.data.length} Active`;
        document.getElementById('statCustomerCount').innerText = res.pagination.total || res.data.length;

        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;

        if (!res.data || res.data.length === 0) {
            listState('customers-table-body', 'empty', 'No records match your search.');
            return;
        }

        customerDataMap = {};
        res.data.forEach(c => { customerDataMap[c.customer_id] = c; });

        tbody.innerHTML = res.data.map(c => {
            const initials = (c.name || 'CU').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            return `
                <tr class="hover:bg-surface-container-low/70 transition-colors group">
                    <td class="py-3.5 px-space-md font-mono text-[11px] text-on-surface-variant font-semibold">#${escapeHTML(c.customer_id)}</td>
                    <td class="py-3.5 px-space-md">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                                ${escapeHTML(initials)}
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="font-semibold text-on-surface truncate">${escapeHTML(c.name)}</span>
                                <span class="text-[10px] text-secondary font-medium flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[12px]">verified</span> Verified Client
                                </span>
                            </div>
                        </div>
                    </td>
                    <td class="py-3.5 px-space-md font-mono text-on-surface-variant">
                        ${c.phone ? `<a href="tel:${escapeHTML(encodeURIComponent(c.phone))}" class="text-secondary hover:underline">${escapeHTML(c.phone)}</a>` : '<span class="text-outline">N/A</span>'}
                    </td>
                    <td class="py-3.5 px-space-md text-on-surface-variant truncate max-w-[180px]">
                        ${c.email ? `<a href="mailto:${escapeHTML(encodeURIComponent(c.email))}" class="text-secondary hover:underline">${escapeHTML(c.email)}</a>` : '<span class="text-outline">N/A</span>'}
                    </td>
                    <td class="py-3.5 px-space-md text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button aria-label="Edit Profile" data-click="action14" data-arg0="${escapeHTML(c.customer_id)}" class="p-1.5 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded-lg transition-colors cursor-pointer" title="Edit Profile" type="button">
                                <span class="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <a href="services.html" class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors inline-block" title="Work Orders History">
                                <span class="material-symbols-outlined text-[18px]">history</span>
                            </a>
                            <button aria-label="Delete Profile" data-click="action15" data-arg0="${escapeHTML(c.customer_id)}" class="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors cursor-pointer" title="Delete Profile" type="button">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        listState('customers-table-body', 'error', 'Could not load records.', () => loadCustomers(currentPage));
        Toast.error(err.message || 'Failed to load customers');
    }
}

function changePage(delta) {
    const target = currentPage + delta;
    if (target >= 1 && target <= totalPages) {
        loadCustomers(target);
    }
}

const debounceSearch = debounce(() => {
    loadCustomers(1);
}, 300);

async function handleCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('input-name').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const email = document.getElementById('input-email').value.trim();

    if (!name || !phone) {
        Toast.error('Please enter name and phone number');
        return;
    }

    try {
        await API.post('/api/customers', { name, phone, email });
        Toast.success('Customer registered in MariaDB!');
        document.getElementById('customer-form').reset();
        loadCustomers(1);
    } catch (err) {
        Toast.error(err.message || 'Failed to register customer');
    }
}

function openEditModal(id) {
    const c = customerDataMap[id];
    if (!c) return;

    Modal.open({
        title: `Edit Customer #${id}`,
        bodyHTML: `
            <div class="extracted-style-9 form-group">
                <label>Full Name *</label>
                <input type="text" id="edit_cust_name" value="${escapeHTML(c.name)}">
            </div>
            <div class="extracted-style-9 form-group">
                <label>Phone Number *</label>
                <input type="text" id="edit_cust_phone" value="${escapeHTML(c.phone)}">
            </div>
            <div class="extracted-style-9 form-group">
                <label>Email Address</label>
                <input type="email" id="edit_cust_email" value="${escapeHTML(c.email || '')}">
            </div>
        `,
        confirmText: 'Update Profile',
        onConfirm: async () => {
            const name = document.getElementById('edit_cust_name').value.trim();
            const phone = document.getElementById('edit_cust_phone').value.trim();
            const email = document.getElementById('edit_cust_email').value.trim();

            if (!name || !phone) {
                Toast.error('Name and phone are required');
                return;
            }

            try {
                await API.put(`/api/customers/${id}`, { name, phone, email });
                Toast.success('Customer profile updated');
                Modal.close();
                loadCustomers(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Failed to update customer');
            }
        }
    });
}

function confirmDelete(id) {
    const c = customerDataMap[id];
    Modal.confirm({
        title: 'Delete Customer',
        message: `Are you sure you want to delete ${c ? c.name : 'this customer'}?`,
        onConfirm: async () => {
            try {
                await API.delete(`/api/customers/${id}`);
                Toast.success('Customer deleted');
                loadCustomers(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Failed to delete customer');
            }
        }
    });
}

function logout() {
    API.logout();
}



const initializePage = () => loadCustomers(1);
initializePage();
})().catch(error => Toast.error(error.message));
