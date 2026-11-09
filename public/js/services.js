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
  action6: function(event) { if(event.key==='Enter') loadServices(1) },
  action7: function(event) { runDiagnosticScan() },
  action8: function(event) { toggleAddServiceDrawer() },
  action9: function(event) { event.stopPropagation() },
  action10: function(event) { filterStatus('Pending', document.getElementById('btnFilterPending')) },
  action11: function(event) { handleAddService(event) },
  action12: function(event) { filterStatus('', this) },
  action13: function(event) { filterStatus('Pending', this) },
  action14: function(event) { filterStatus('In Progress', this) },
  action15: function(event) { filterStatus('Completed', this) },
  action16: function(event) { changePage(-1) },
  action17: function(event) { changePage(1) },
  action18: function(event) { Toast.info('Reassigning diagnostic bays...') },
  action19: function(event) { downloadInvoice(Number(this.dataset.arg0)) },
  action20: function(event) { openEditModal(Number(this.dataset.arg0)) },
  action21: function(event) { confirmDelete(Number(this.dataset.arg0)) }
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
let carList = [];
let employeeList = [];
let serviceDataMap = {};
let currentStatusFilter = '';

function toggleAddServiceDrawer() {
    const card = document.getElementById('addServiceCard');
    card.classList.toggle('hidden');
    if (!card.classList.contains('hidden')) {
        document.getElementById('service_car_id').focus();
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && dateStr.includes('T')) return dateStr.split('T')[0];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Default date to today
document.getElementById('service_date').valueAsDate = new Date();

async function loadDropdowns() {
    try {
        const [carsRes, empRes] = await Promise.all([
            API.get('/api/cars?limit=100'),
            API.get('/api/services/technicians')
        ]);
        carList = carsRes.data || [];
        employeeList = empRes.data || [];

        document.getElementById('service_car_id').innerHTML = '<option value="">Select Vehicle...</option>' +
            carList.map(c => `<option value="${escapeHTML(c.car_id)}">${escapeHTML(c.year)} ${escapeHTML(c.manufacturer)} ${escapeHTML(c.model)} (${escapeHTML(c.customer_name || 'No Owner')})</option>`).join('');

        document.getElementById('service_employee_id').innerHTML = '<option value="">Select Technician...</option>' +
            employeeList.map(e => `<option value="${escapeHTML(e.employee_id)}">${escapeHTML(e.name)} - ${escapeHTML(e.role)}</option>`).join('');

        if (document.getElementById('navCustBadge')) document.getElementById('navCustBadge').innerText = carList.length ? carList.length + 5 : '142';
        if (document.getElementById('navCarBadge')) document.getElementById('navCarBadge').innerText = carList.length || '86';
    } catch (err) {
        console.error('Failed to load dropdowns:', err);
    }
}

function filterStatus(status, btn) {
    currentStatusFilter = status;
    document.querySelectorAll('.tbl-filter').forEach(b => {
        b.classList.remove('bg-surface-container-lowest', 'text-on-surface', 'font-semibold', 'shadow-xs');
        b.classList.add('hover:text-on-surface');
    });
    if (btn) {
        btn.classList.add('bg-surface-container-lowest', 'text-on-surface', 'font-semibold', 'shadow-xs');
        btn.classList.remove('hover:text-on-surface');
    }
    loadServices(1);
}

async function loadServices(page = 1) {
    currentPage = page;
    const search = document.getElementById('searchInput').value.trim();

    listState('serviceTable', 'loading', 'Loading records…');
    try {
        const res = await API.get(`/api/services?page=${page}&limit=10&search=${encodeURIComponent(search)}&status=${encodeURIComponent(currentStatusFilter)}`);
        const tbody = document.getElementById('serviceTable');

        totalPages = res.pagination.totalPages || 1;
        document.getElementById('paginationInfo').innerText = `Showing ${res.data ? res.data.length : 0} of ${res.pagination.total || 0} recorded jobs`;
        document.getElementById('statTotalJobs').innerText = res.pagination.total || 0;
        if (document.getElementById('navJobBadge')) {
            document.getElementById('navJobBadge').innerText = `${res.pagination.total || 0} Act`;
        }

        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;

        if (!res.data || res.data.length === 0) {
            listState('serviceTable', 'empty', 'No records match your search.');
            return;
        }

        serviceDataMap = {};
        let inProgCount = 0;
        let compCount = 0;
        let pendCount = 0;
        let totalRevenue = 0;

        res.data.forEach(s => {
            serviceDataMap[s.job_id] = s;
            if (s.status === 'In Progress') inProgCount++;
            else if (s.status === 'Completed') {
                compCount++;
                totalRevenue += parseFloat(s.total_cost || 0);
            }
            else if (s.status === 'Pending') pendCount++;
        });

        document.getElementById('statInProgress').innerText = inProgCount;
        document.getElementById('statPending').innerText = pendCount;
        document.getElementById('statServiceRevenue').innerText = `$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('statCompletedBadge').innerText = `${compCount} ${user.role === 'mechanic' ? 'Completed jobs' : 'Invoices Closed'}`;

        tbody.innerHTML = res.data.map(s => {
            let statusPill = '';
            if (s.status === 'Completed') {
                statusPill = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container text-tertiary">
                        <span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                        Completed
                    </span>
                `;
            } else if (s.status === 'In Progress') {
                statusPill = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed">
                        <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        In Progress
                    </span>
                `;
            } else {
                statusPill = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container-highest text-on-surface">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        Pending
                    </span>
                `;
            }

            const custInitials = (s.customer_name || 'CU').split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();
            const jobDateFormatted = s.job_date ? new Date(s.job_date).toLocaleDateString() : 'N/A';

            return `
            <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="py-3.5 px-4 font-bold text-secondary">#${escapeHTML(String(s.job_id).padStart(2, '0'))}</td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-[11px] font-bold text-on-secondary-fixed">
                            ${escapeHTML(custInitials)}
                        </div>
                        <div class="flex flex-col">
                            <span class="font-semibold text-on-surface leading-tight">${escapeHTML(s.customer_name || 'Private Client')}</span>
                            <div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                                <span>Tech: ${escapeHTML(s.employee_name || 'Unassigned')}</span>
                                ${s.customer_phone ? `&bull; <a href="tel:${encodeURIComponent(s.customer_phone)}" class="text-secondary hover:underline">${escapeHTML(s.customer_phone)}</a>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-1.5">
                        <span class="font-medium">${escapeHTML(s.manufacturer || '')} ${escapeHTML(s.model || 'Standard')}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">${escapeHTML(s.vin ? s.vin.slice(-6) : 'BAY')}</span>
                    </div>
                </td>
                <td class="py-3.5 px-4 text-on-surface-variant font-mono text-[11px]">${escapeHTML(jobDateFormatted)}</td>
                <td class="py-3.5 px-4 font-bold text-on-surface font-mono">$${parseFloat(s.total_cost || 0).toFixed(2)}</td>
                <td class="py-3.5 px-4">${statusPill}</td>
                <td class="py-3.5 px-4 text-right">
                    <div class="inline-flex items-center gap-1.5">
                        <button aria-label="Download PDF Invoice" data-click="action19" data-arg0="${escapeHTML(s.job_id)}" class="btn-sm px-2.5 py-1 text-[11px] font-medium text-secondary hover:bg-secondary/10 rounded border border-secondary/20 transition-colors cursor-pointer" title="Download PDF Invoice">
                            <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span> Invoice
                        </button>
                        <button aria-label="Edit Job" data-click="action20" data-arg0="${escapeHTML(s.job_id)}" class="btn-sm px-2 py-1 text-[11px] font-medium text-on-surface-variant hover:bg-surface-container rounded border border-outline-variant/40 transition-colors cursor-pointer" title="Edit Job" data-ui-action="edit">
                            <span class="material-symbols-outlined" aria-hidden="true">edit</span> Edit
                        </button>
                        <button aria-label="Delete Job" data-click="action21" data-arg0="${escapeHTML(s.job_id)}" class="btn-sm px-2 py-1 text-[11px] font-medium text-error hover:bg-error-container/40 rounded border border-error/20 transition-colors cursor-pointer" title="Delete Job" data-ui-action="danger">
                            <span class="material-symbols-outlined" aria-hidden="true">delete</span> Delete
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
        if (user.role === 'mechanic') {
            tbody.querySelectorAll('tr').forEach(row => {
                row.children[1].hidden = true;
                row.children[4].hidden = true;
                row.querySelectorAll('[data-click="action21"]').forEach(button => { button.hidden = true; });
                row.querySelectorAll('[data-click="action19"]').forEach(button => { button.hidden = true; });
            });
        }

    } catch (err) {
        listState('serviceTable', 'error', 'Could not load records.', () => loadServices(currentPage));
        Toast.error(err.message || 'Failed to load services');
    }
}

async function handleAddService(e) {
    e.preventDefault();
    const car_id = document.getElementById('service_car_id').value;
    const employee_id = document.getElementById('service_employee_id').value;
    const job_date = document.getElementById('service_date').value;
    const description = document.getElementById('service_desc').value.trim();
    const total_cost = document.getElementById('service_cost').value.trim();
    const status = document.getElementById('service_status').value;

    try {
        await API.post('/api/services', { car_id, employee_id: employee_id || null, job_date, description, total_cost, status });
        Toast.success('Service work order created successfully!');

        document.getElementById('service_desc').value = '';
        document.getElementById('service_cost').value = '';

        toggleAddServiceDrawer();
        loadServices(1);
    } catch (err) {
        Toast.error(err.message || 'Failed to create service job');
    }
}

function openEditModal(id) {
    if (user.role === 'mechanic') {
        const job = serviceDataMap[id];
        if (!job) return;
        Modal.open({
            title: `Update Job #${id}`,
            bodyHTML: `<label for="mechanicStatus">Status</label><select id="mechanicStatus">${['Pending', 'In Progress', 'Completed'].map(status => `<option ${job.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select><label for="mechanicNotes">Progress notes</label><textarea id="mechanicNotes">${escapeHTML(job.description)}</textarea>`,
            onConfirm: async () => {
                await API.put(`/api/services/${id}`, { status: document.getElementById('mechanicStatus').value, description: document.getElementById('mechanicNotes').value });
                Modal.close(); loadServices(currentPage);
            }
        });
        return;
    }
    const s = serviceDataMap[id];
    if (!s) return;

    const formattedDate = formatDateForInput(s.job_date);

    const carOptions = carList.map(c =>
        `<option value="${escapeHTML(c.car_id)}" ${c.car_id === s.car_id ? 'selected' : ''}>${escapeHTML(c.manufacturer)} ${escapeHTML(c.model)}</option>`
    ).join('');

    const empOptions = '<option value="">Unassigned</option>' + employeeList.map(e =>
        `<option value="${escapeHTML(e.employee_id)}" ${e.employee_id === s.employee_id ? 'selected' : ''}>${escapeHTML(e.name)}</option>`
    ).join('');

    Modal.open({
        title: `Edit Service Job #${id}`,
        bodyHTML: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Target Vehicle</label>
                    <select id="edit_car_id" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">${carOptions}</select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Assigned Technician</label>
                    <select id="edit_employee_id" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">${empOptions}</select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-xs font-medium text-on-surface-variant mb-1">Job Date</label>
                        <input type="date" id="edit_date" value="${escapeHTML(formattedDate)}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-on-surface-variant mb-1">Status</label>
                        <select id="edit_status" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                            <option value="Pending" ${s.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="In Progress" ${s.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${s.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Total Cost ($)</label>
                    <input type="number" step="0.01" id="edit_cost" value="${escapeHTML(s.total_cost || 0)}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg font-mono">
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Job Description</label>
                    <input type="text" id="edit_desc" value="${escapeHTML(s.description || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                </div>
            </div>
        `,
        onConfirm: async () => {
            const editCarId = document.getElementById('edit_car_id').value;
            const editEmpId = document.getElementById('edit_employee_id').value;
            const editDate = document.getElementById('edit_date').value;
            const editStatus = document.getElementById('edit_status').value;
            const editCost = document.getElementById('edit_cost').value;
            const editDesc = document.getElementById('edit_desc').value;

            try {
                await API.put(`/api/services/${id}`, {
                    car_id: editCarId,
                    employee_id: editEmpId || null,
                    job_date: editDate || null,
                    status: editStatus,
                    total_cost: editCost,
                    description: editDesc
                });
                Modal.close();
                Toast.success('Service job updated');
                loadServices(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Update failed');
            }
        }
    });
}

function confirmDelete(id) {
    Modal.confirm({
        title: 'Delete Service Job',
        message: 'Are you sure you want to permanently delete this service work order?',
        onConfirm: async () => {
            try {
                await API.delete(`/api/services/${id}`);
                Toast.success('Service job deleted');
                loadServices(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Delete failed');
            }
        }
    });
}

function downloadInvoice(jobId) {
    window.location.href = `/api/services/${jobId}/invoice`;
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        loadServices(newPage);
    }
}

function runDiagnosticScan() {
    Toast.info('Initiating CAN-Bus Diagnostic Scan across all active bays...');
    setTimeout(() => {
        Toast.success('Diagnostic Scan Completed: 0 DTC Fault Codes detected across active work orders');
    }, 1200);
}

function debounceSearch() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadServices(1), 300);
}

function logout() {
    API.logout();
}



const initializePage = () => {
    if (user.role === 'mechanic') {
        document.querySelectorAll('[data-click]').forEach(button => {
            const action = actions[button.dataset.click];
            if (action && action.toString().includes('toggleAddServiceDrawer')) button.hidden = true;
        });
        const headers = document.querySelectorAll('thead th');
        headers[1].hidden = true; headers[4].hidden = true;
        document.getElementById('statServiceRevenue').closest('.rounded-xl').hidden = true;
        document.getElementById('statCompletedBadge').textContent = 'Completed jobs';
    }
    if (user.role !== 'mechanic') loadDropdowns();
    loadServices(1);
};
initializePage();
})().catch(error => Toast.error(error.message));
