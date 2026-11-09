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
  action6: function(event) { if(event.key==='Enter') loadEmployees(1) },
  action7: function(event) { toggleAddEmployeeDrawer() },
  action8: function(event) { event.stopPropagation() },
  action9: function(event) { handleAddEmployee(event) },
  action10: function(event) { loadEmployees(currentPage) },
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



const currentUser = API.getUser();
if (currentUser && currentUser.role !== 'admin') {
    Toast.error('Staff directory is restricted to Administrator access.');
}

let currentPage = 1;
let totalPages = 1;
let employeeDataMap = {};

function toggleAddEmployeeDrawer() {
    const card = document.getElementById('addEmployeeCard');
    card.classList.toggle('hidden');
    if (!card.classList.contains('hidden')) {
        document.getElementById('emp_name').focus();
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

async function loadEmployees(page = 1) {
    currentPage = page;
    const search = document.getElementById('searchInput').value.trim();

    listState('employeeTable', 'loading', 'Loading records…');
    try {
        const res = await API.get(`/api/employees?page=${page}&limit=10&search=${encodeURIComponent(search)}`);
        const tbody = document.getElementById('employeeTable');

        totalPages = res.pagination.totalPages || 1;
        document.getElementById('paginationInfo').innerText = `Page ${res.pagination.page} of ${totalPages} (${res.pagination.total} staff members)`;
        document.getElementById('statStaffTotal').innerText = res.pagination.total || 0;
        if (document.getElementById('navEmpCountBadge')) {
            document.getElementById('navEmpCountBadge').innerText = `${res.pagination.total || 0} Cert`;
        }

        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;

        if (!res.data || res.data.length === 0) {
            listState('employeeTable', 'empty', 'No records match your search.');
            return;
        }

        employeeDataMap = {};
        let mechCount = 0;
        let totalPayroll = 0;

        res.data.forEach(e => {
            employeeDataMap[e.employee_id] = e;
            const r = (e.role || '').toLowerCase();
            if (r.includes('mechanic') || r.includes('tech')) mechCount++;
            totalPayroll += parseFloat(e.salary || 0);
        });

        document.getElementById('statMechanics').innerText = mechCount;
        document.getElementById('statPayroll').innerText = `$${(totalPayroll).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;

        tbody.innerHTML = res.data.map(e => {
            const initials = (e.name || 'EM').split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase();

            return `
            <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="py-3 px-4 font-mono text-[11px] text-secondary font-bold">#${escapeHTML(String(e.employee_id).padStart(2, '0'))}</td>
                <td class="py-3 px-4 font-semibold text-on-surface">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-on-secondary-fixed">
                            ${escapeHTML(initials)}
                        </div>
                        <span>${escapeHTML(e.name)}</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary-fixed text-on-secondary-fixed">
                        ${escapeHTML(e.role)}
                    </span>
                </td>
                <td class="py-3 px-4 text-on-surface-variant font-mono text-[11px]">
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">call</span>
                        ${e.phone ? `<a href="tel:${escapeHTML(encodeURIComponent(e.phone))}" class="text-secondary hover:underline">${escapeHTML(e.phone)}</a>` : '<span class="text-outline">N/A</span>'}
                    </div>
                </td>
                <td class="py-3 px-4 font-mono font-medium text-on-surface">
                    $${parseFloat(e.salary || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td class="py-3 px-4 text-right">
                    <div class="inline-flex items-center gap-1.5">
                        <button data-click="action13" data-arg0="${escapeHTML(e.employee_id)}" class="btn-sm px-2.5 py-1 text-[11px] font-medium text-secondary hover:bg-secondary/10 rounded border border-secondary/20 transition-colors cursor-pointer" data-ui-action="edit">
                            <span class="material-symbols-outlined" aria-hidden="true">edit</span> Edit
                        </button>
                        <button data-click="action14" data-arg0="${escapeHTML(e.employee_id)}" class="btn-sm px-2.5 py-1 text-[11px] font-medium text-error hover:bg-error-container/40 rounded border border-error/20 transition-colors cursor-pointer" data-ui-action="danger">
                            <span class="material-symbols-outlined" aria-hidden="true">delete</span> Delete
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        listState('employeeTable', 'error', 'Could not load records.', () => loadEmployees(currentPage));
        Toast.error(err.message || 'Failed to load employees');
    }
}

async function handleAddEmployee(e) {
    e.preventDefault();
    const name = document.getElementById('emp_name').value.trim();
    const role = document.getElementById('emp_role').value.trim();
    const phone = document.getElementById('emp_phone').value.trim();
    const salary = document.getElementById('emp_salary').value.trim();

    try {
        await API.post('/api/employees', { name, role, phone, salary });
        Toast.success('Employee added to staff roster!');

        document.getElementById('emp_name').value = '';
        document.getElementById('emp_role').value = '';
        document.getElementById('emp_phone').value = '';
        document.getElementById('emp_salary').value = '';

        toggleAddEmployeeDrawer();
        loadEmployees(1);
    } catch (err) {
        Toast.error(err.message || 'Failed to add employee');
    }
}

function openEditModal(id) {
    const e = employeeDataMap[id];
    if (!e) return;

    Modal.open({
        title: `Edit Personnel #${id}`,
        bodyHTML: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Full Legal Name</label>
                    <input type="text" id="edit_name" value="${escapeHTML(e.name || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Designation / Role</label>
                    <input type="text" id="edit_role" value="${escapeHTML(e.role || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Contact Phone</label>
                    <input type="text" id="edit_phone" value="${escapeHTML(e.phone || '')}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg">
                </div>
                <div>
                    <label class="block text-xs font-medium text-on-surface-variant mb-1">Salary ($)</label>
                    <input type="number" step="0.01" id="edit_salary" value="${escapeHTML(e.salary || 0)}" class="w-full px-3 py-2 text-sm bg-surface-container-low border border-outline-variant/40 rounded-lg font-mono">
                </div>
            </div>
        `,
        onConfirm: async () => {
            const editName = document.getElementById('edit_name').value.trim();
            const editRole = document.getElementById('edit_role').value.trim();
            const editPhone = document.getElementById('edit_phone').value.trim();
            const editSalary = document.getElementById('edit_salary').value.trim();

            try {
                await API.put(`/api/employees/${id}`, { name: editName, role: editRole, phone: editPhone, salary: editSalary });
                Modal.close();
                Toast.success('Employee profile updated');
                loadEmployees(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Update failed');
            }
        }
    });
}

function confirmDelete(id) {
    Modal.confirm({
        title: 'Delete Employee',
        message: 'Are you sure you want to permanently remove this employee from the personnel roster?',
        onConfirm: async () => {
            try {
                await API.delete(`/api/employees/${id}`);
                Toast.success('Employee deleted');
                loadEmployees(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Delete failed');
            }
        }
    });
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        loadEmployees(newPage);
    }
}

function debounceSearch() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadEmployees(1), 300);
}

function logout() {
    API.logout();
}



const initializePage = () => {
    loadEmployees(1);
};
initializePage();
})().catch(error => Toast.error(error.message));
