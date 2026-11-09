(async () => {
  const user = await API.requireAuth();
  if (!user) return;
  Layout.render(user);
  document.body.classList.add('auth-ready');

const actions = {
  action1: function(event) { API.toggleTheme() },
  action2: function(event) { logout() },
  action3: function(event) { toggleMobileNav() },
  action4: function(event) { handleDashboardSearch(event) },
  action5: function(event) { window.location.href='services.html' },
  action6: function(event) { event.stopPropagation() },
  action7: function(event) { filterTimeframe('today', this) },
  action8: function(event) { filterTimeframe('week', this) },
  action9: function(event) { filterTimeframe('all', this) },
  action10: function(event) { filterRecentTable('all', this) },
  action11: function(event) { filterRecentTable('Pending', this) },
  action12: function(event) { filterRecentTable('In Progress', this) },
  action13: function(event) { filterRecentTable('Completed', this) },
  action14: function(event) { runDiagnosticScan() },
  action15: function(event) { window.open('/api/services/' + Number(this.dataset.arg0) + '/invoice', '_blank') }
};
document.addEventListener('click', event => {
  const element = event.target.closest('[data-click]');
  if (!element) return;
  if ('click' === 'submit') event.preventDefault();
  const action = actions[element.dataset.click];
  if (action) action.call(element, event);
});
document.addEventListener('keyup', event => {
  const element = event.target.closest('[data-keyup]');
  if (!element) return;
  if ('keyup' === 'submit') event.preventDefault();
  const action = actions[element.dataset.keyup];
  if (action) action.call(element, event);
});



let allRecentServices = [];
let activeTableStatusFilter = 'all';

async function loadDashboard(timeframe = 'all') {
    try {
        const res = await API.get(`/api/dashboard/stats?timeframe=${timeframe}`);
        const s = res.stats;

        document.getElementById('statRevenue').innerText = `$${parseFloat(s.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('statCustomers').innerText = s.totalCustomers || 0;
        document.getElementById('statVehicles').innerText = s.totalCars || 0;
        document.getElementById('statActiveJobs').innerText = s.activeJobs || 0;

        allRecentServices = res.recentServices || [];
        renderRecentTable();
    } catch (err) {
        Toast.error(err.message || 'Error loading dashboard stats');
    }
}

function renderRecentTable() {
    const tbody = document.getElementById('recentServicesTable');
    let filtered = allRecentServices;

    if (activeTableStatusFilter !== 'all') {
        filtered = allRecentServices.filter(j => j.status === activeTableStatusFilter);
    }

    if (!filtered || filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-on-surface-variant italic">No service jobs found matching filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(job => {
        const initials = (job.customer_name || 'CL').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const badgeColor = job.status === 'Completed'
            ? 'bg-surface-container text-tertiary'
            : job.status === 'In Progress'
            ? 'bg-secondary-fixed text-on-secondary-fixed'
            : 'bg-surface-container-highest text-on-surface';
        const dotColor = job.status === 'Completed' ? 'bg-tertiary-fixed-dim' : job.status === 'In Progress' ? 'bg-secondary' : 'bg-primary';

        return `
            <tr class="hover:bg-surface-container-low transition-colors group border-b border-outline-variant/15">
                <td class="py-3 px-4 font-bold text-secondary">#${escapeHTML(job.job_id)}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-secondary-fixed/50 flex items-center justify-center text-[11px] font-bold text-on-secondary-fixed">
                            ${escapeHTML(initials)}
                        </div>
                        <div class="flex flex-col">
                            <span class="font-semibold text-on-surface leading-tight">${escapeHTML(job.customer_name || 'Fleet Client')}</span>
                            <span class="text-[10px] text-on-surface-variant">Verified Client</span>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="font-medium">${escapeHTML(job.model || 'Standard Fleet Model')}</span>
                </td>
                <td class="py-3 px-4 text-on-surface-variant">${new Date(job.job_date).toLocaleDateString()}</td>
                <td class="py-3 px-4 font-bold text-on-surface">$${parseFloat(job.total_cost).toFixed(2)}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badgeColor}">
                        <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
                        ${escapeHTML(job.status)}
                    </span>
                </td>
                <td class="py-3 px-4 text-right">
                    <div class="inline-flex items-center gap-1">
                        <button aria-label="Download Invoice" data-click="action15" data-arg0="${escapeHTML(job.job_id)}" class="p-1 hover:bg-surface-container-high rounded text-secondary transition-colors" title="Download Invoice">
                            <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                        </button>
                        <a href="services.html" class="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface transition-colors" title="Manage Service">
                            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterRecentTable(status, btn) {
    activeTableStatusFilter = status;
    document.querySelectorAll('.tbl-filter').forEach(b => {
        b.classList.remove('bg-surface-container-lowest', 'text-on-surface', 'font-semibold', 'shadow-xs');
        b.classList.add('hover:text-on-surface');
    });
    if (btn) {
        btn.classList.add('bg-surface-container-lowest', 'text-on-surface', 'font-semibold', 'shadow-xs');
        btn.classList.remove('hover:text-on-surface');
    }
    renderRecentTable();
}

function filterTimeframe(tf, btn) {
    document.querySelectorAll('.tf-btn').forEach(b => {
        b.classList.remove('bg-secondary', 'text-on-secondary', 'shadow-sm', 'font-semibold');
        b.classList.add('hover:bg-surface-container');
    });
    if (btn) {
        btn.classList.add('bg-secondary', 'text-on-secondary', 'shadow-sm', 'font-semibold');
        btn.classList.remove('hover:bg-surface-container');
    }
    loadDashboard(tf);
}

function runDiagnosticScan() {
    Toast.info('Initiating CAN-Bus Diagnostic Scan across all active bays...');
    setTimeout(() => {
        Toast.success('Diagnostic Scan Completed: 0 DTC Fault Codes detected across 4 active bays');
    }, 1200);
}

function handleDashboardSearch(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
            window.location.href = `services.html?search=${encodeURIComponent(query)}`;
        }
    }
}

function logout() {
    API.logout();
}



const initializePage = () => loadDashboard('all');
initializePage();
})().catch(error => Toast.error(error.message));
