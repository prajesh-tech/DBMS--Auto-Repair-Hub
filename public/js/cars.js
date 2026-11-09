(async () => {
  const user = await API.requireAuth();
  if (!user) return;
  Layout.render(user);
  document.body.classList.add('auth-ready');

const actions = {
  action1: function(event) { if(document.documentElement.classList.contains('dark')) API.toggleTheme() },
  action2: function(event) { API.toggleTheme() },
  action3: function(event) { logout() },
  action4: function(event) { toggleMobileNav() },
  action5: function(event) { debounceSearch() },
  action6: function(event) { if(event.key==='Enter') loadCars(1) },
  action7: function(event) { toggleAddCarDrawer() },
  action8: function(event) { event.stopPropagation() },
  action9: function(event) { handleAddCar(event) },
  action10: function(event) { loadCars(currentPage) },
  action11: function(event) { changePage(-1) },
  action12: function(event) { changePage(1) },
  action13: function(event) { openEditModal(Number(this.dataset.arg0)) },
  action14: function(event) { confirmDelete(Number(this.dataset.arg0)) }
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
document.addEventListener('keyup', event => {
  const element = event.target.closest('[data-keyup]');
  if (!element) return;
  if ('keyup' === 'submit') event.preventDefault();
  const action = actions[element.dataset.keyup];
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
let customerList = [];
let carDataMap = {};

function toggleAddCarDrawer() {
    const card = document.getElementById('addCarCard');
    card.classList.toggle('hidden');
    if (!card.classList.contains('hidden')) {
        document.getElementById('car_vin').focus();
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadCustomersDropdown() {
    try {
        const res = await API.get('/api/customers?limit=100');
        customerList = res.data || [];
        const select = document.getElementById('car_customer_id');
        select.innerHTML = '<option value="">Select Owner Account...</option>' +
            customerList.map(c => `<option value="${escapeHTML(c.customer_id)}">${escapeHTML(c.name)} (#${escapeHTML(c.customer_id)})</option>`).join('');
    } catch (err) {
        console.error('Failed to populate customers dropdown:', err);
    }
}

async function loadCars(page = 1) {
    currentPage = page;
    const search = document.getElementById('searchInput').value.trim();

    listState('carTable', 'loading', 'Loading records…');
    try {
        const res = await API.get(`/api/cars?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
        const tbody = document.getElementById('carTable');

        totalPages = res.pagination.totalPages || 1;
        document.getElementById('paginationInfo').innerText = `Page ${res.pagination.page} of ${totalPages} (${res.pagination.total} total vehicles)`;
        document.getElementById('statFleetTotal').innerText = res.pagination.total || 0;
        if (document.getElementById('navFleetCountBadge')) {
            document.getElementById('navFleetCountBadge').innerText = res.pagination.total || '0';
        }

        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;

        if (!res.data || res.data.length === 0) {
            listState('carTable', 'empty', 'No records match your search.');
            return;
        }

        carDataMap = {};
        const makeCounts = {};
        res.data.forEach(c => {
            carDataMap[c.car_id] = c;
            if (c.manufacturer) {
                makeCounts[c.manufacturer] = (makeCounts[c.manufacturer] || 0) + 1;
            }
        });

        // Set top make
        const sortedMakes = Object.keys(makeCounts).sort((a,b) => makeCounts[b] - makeCounts[a]);
        if (sortedMakes.length > 0) {
            document.getElementById('statTopMake').innerText = sortedMakes[0];
        }

        tbody.innerHTML = res.data.map(c => {
            const custInitials = (c.customer_name || 'CU').split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();

            return `
            <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="py-3 px-4 font-mono text-[11px] text-secondary font-bold">#${escapeHTML(String(c.car_id).padStart(2, '0'))}</td>
                <td class="py-3 px-4">
                    <span class="font-mono text-xs px-2 py-0.5 rounded bg-surface-container font-medium text-on-surface tracking-wider">${escapeHTML(c.vin)}</span>
                </td>
                <td class="py-3 px-4 font-medium text-on-surface">
                    <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-on-secondary-fixed">
                            ${escapeHTML(custInitials)}
                        </div>
                        <span>${escapeHTML(c.customer_name || 'Unassigned')}</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <div class="font-semibold text-on-surface">${escapeHTML(c.manufacturer)} ${escapeHTML(c.model)}</div>
                </td>
                <td class="py-3 px-4 text-on-surface-variant font-mono">${escapeHTML(c.year)}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                        <span class="w-2 h-2 rounded-full border border-outline-variant/40" data-car-color="${escapeHTML(String(c.color || '').toLowerCase())}"></span>
                        ${escapeHTML(c.color || 'N/A')}
                    </span>
                </td>
                <td class="py-3 px-4 text-right">
                    <div class="inline-flex items-center gap-1.5">
                        <button data-click="action13" data-arg0="${escapeHTML(c.car_id)}" class="btn-sm px-2.5 py-1 text-[11px] font-medium text-secondary hover:bg-secondary/10 rounded border border-secondary/20 transition-colors cursor-pointer" data-ui-action="edit">
                            <span class="material-symbols-outlined" aria-hidden="true">edit</span> Edit
                        </button>
                        <button data-click="action14" data-arg0="${escapeHTML(c.car_id)}" class="btn-sm px-2.5 py-1 text-[11px] font-medium text-error hover:bg-error-container/40 rounded border border-error/20 transition-colors cursor-pointer" data-ui-action="danger">
                            <span class="material-symbols-outlined" aria-hidden="true">delete</span> Delete
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        listState('carTable', 'error', 'Could not load records.', () => loadCars(currentPage));
        Toast.error(err.message || 'Failed to load vehicles');
    }
}



async function handleAddCar(e) {
    e.preventDefault();
    const vin = document.getElementById('car_vin').value.trim();
    const manufacturer = document.getElementById('car_manufacturer').value.trim();
    const model = document.getElementById('car_model').value.trim();
    const year = document.getElementById('car_year').value.trim();
    const color = document.getElementById('car_color').value.trim();
    const customer_id = document.getElementById('car_customer_id').value;

    try {
        await API.post('/api/cars', { vin, manufacturer, model, year, color, customer_id });
        Toast.success('Vehicle registered to fleet successfully!');

        document.getElementById('car_vin').value = '';
        document.getElementById('car_manufacturer').value = '';
        document.getElementById('car_model').value = '';
        document.getElementById('car_year').value = '';
        document.getElementById('car_color').value = '';

        toggleAddCarDrawer();
        loadCars(1);
    } catch (err) {
        Toast.error(err.message || 'Failed to add vehicle');
    }
}

function openEditModal(id) {
    const c = carDataMap[id];
    if (!c) return;

    const custOptions = customerList.map(cust =>
        `<option value="${escapeHTML(cust.customer_id)}" ${cust.customer_id === c.customer_id ? 'selected' : ''}>${escapeHTML(cust.name)}</option>`
    ).join('');

    Modal.open({
        title: `Edit Vehicle #${id}`,
        bodyHTML: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">VIN Number</label>
                    <input type="text" id="edit_vin" value="${escapeHTML(c.vin || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg font-mono uppercase">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-medium text-on-surface-variant mb-1">Manufacturer</label>
                        <input type="text" id="edit_manufacturer" value="${escapeHTML(c.manufacturer || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-on-surface-variant mb-1">Model</label>
                        <input type="text" id="edit_model" value="${escapeHTML(c.model || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-medium text-on-surface-variant mb-1">Year</label>
                        <input type="number" id="edit_year" value="${escapeHTML(c.year || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg font-mono">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-on-surface-variant mb-1">Color</label>
                        <input type="text" id="edit_color" value="${escapeHTML(c.color || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Owner Account</label>
                    <select id="edit_customer_id" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">${custOptions}</select>
                </div>
            </div>
        `,
        onConfirm: async () => {
            const editVin = document.getElementById('edit_vin').value.trim();
            const editMake = document.getElementById('edit_manufacturer').value.trim();
            const editModel = document.getElementById('edit_model').value.trim();
            const editYear = document.getElementById('edit_year').value.trim();
            const editColor = document.getElementById('edit_color').value.trim();
            const editCustId = document.getElementById('edit_customer_id').value;

            try {
                await API.put(`/api/cars/${id}`, { vin: editVin, manufacturer: editMake, model: editModel, year: editYear, color: editColor, customer_id: editCustId });
                Modal.close();
                Toast.success('Vehicle updated successfully');
                loadCars(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Update failed');
            }
        }
    });
}

function confirmDelete(id) {
    Modal.confirm({
        title: 'Delete Vehicle Record',
        message: 'Are you sure you want to permanently delete this vehicle? Related service records may be affected.',
        onConfirm: async () => {
            try {
                await API.delete(`/api/cars/${id}`);
                Toast.success('Vehicle deleted from fleet');
                loadCars(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Delete failed');
            }
        }
    });
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        loadCars(newPage);
    }
}

function debounceSearch() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadCars(1), 300);
}

function logout() {
    API.logout();
}



const initializePage = () => {
    loadCustomersDropdown();
    loadCars(1);
};
initializePage();
})().catch(error => Toast.error(error.message));
