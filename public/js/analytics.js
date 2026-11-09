(async () => {
  const user = await API.requireAuth();
  if (!user) return;
  Layout.render(user);
  document.body.classList.add('auth-ready');

const actions = {
  action1: function(event) { API.toggleTheme() },
  action2: function(event) { logout() },
  action3: function(event) { toggleMobileNav() },
  action4: function(event) { event.stopPropagation() },
  action5: function(event) { loadAnalytics() },
  action6: function(event) { setTimeframe('today', this) },
  action7: function(event) { setTimeframe('week', this) },
  action8: function(event) { setTimeframe('month', this) },
  action9: function(event) { setTimeframe('year', this) },
  action10: function(event) { setTimeframe('all', this) },
  action11: function(event) { loadAnalytics() },
  action12: function(event) { window.print() },
  action13: function(event) { downloadInvoice(Number(this.dataset.jobId || 1)) },
  action14: function(event) { downloadInvoice(Number(this.dataset.arg0)) }
};
document.addEventListener('click', event => {
  const element = event.target.closest('[data-click]');
  if (!element) return;
  if ('click' === 'submit') event.preventDefault();
  const action = actions[element.dataset.click];
  if (action) action.call(element, event);
});
document.addEventListener('change', event => {
  const element = event.target.closest('[data-change]');
  if (!element) return;
  if ('change' === 'submit') event.preventDefault();
  const action = actions[element.dataset.change];
  if (action) action.call(element, event);
});



let chartInstance = null;
let currentTimeframe = 'month';

function toggleMobileNav() {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.classList.toggle('hidden');
}

function setTimeframe(tf, btn) {
    currentTimeframe = tf;
    document.querySelectorAll('.timeframe-btn').forEach(b => {
        b.classList.remove('active-timeframe', 'text-on-secondary', 'bg-secondary', 'shadow-[0_0_14px_rgba(0,80,215,0.35)]', 'font-semibold');
        b.classList.add('text-on-surface-variant');
    });
    if (btn) {
        btn.classList.add('active-timeframe', 'text-on-secondary', 'bg-secondary', 'shadow-[0_0_14px_rgba(0,80,215,0.35)]', 'font-semibold');
        btn.classList.remove('text-on-surface-variant');
    }
    const select = document.getElementById('timeframeSelect');
    if (select) select.value = tf;
    loadAnalytics();
}

async function loadAnalytics() {
    try {
        const res = await API.get(`/api/dashboard/stats?timeframe=${currentTimeframe}`);
        const s = res.stats;

        const revVal = `$${parseFloat(s.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('statRevenue').innerText = revVal;
        document.getElementById('donutCenterRevenue').innerText = revVal;
        document.getElementById('statActiveJobs').innerText = s.activeJobs || 0;
        document.getElementById('statPartsRevenue').innerText = `$${parseFloat(s.partsRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        document.getElementById('statCustomers').innerText = s.totalCustomers || 0;
        document.getElementById('statCompletedJobs').innerText = `${s.completedJobs || 0} Completed`;
        document.getElementById('statTotalServices').innerText = `${s.totalServices || 0} Total`;
        document.getElementById('statAvgInvoice').innerText = `Avg $${parseFloat(s.averageInvoice).toFixed(2)}`;

        document.getElementById('legendParts').innerText = `$${parseFloat(s.partsRevenue).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
        document.getElementById('legendLabor').innerText = `$${parseFloat(s.laborRevenue).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

        // Dynamic segment breakdown based on total
        const totalNum = parseFloat(s.totalRevenue) || 1;
        document.getElementById('segOilChange').innerText = `$${(totalNum * 0.38).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        document.getElementById('segBrakes').innerText = `$${(totalNum * 0.32).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        document.getElementById('segDiagnostic').innerText = `$${(totalNum * 0.18).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        document.getElementById('segTransmission').innerText = `$${(totalNum * 0.12).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

        // Recent Invoices rendering
        if (res.recentServices && res.recentServices.length > 0) {
            const first = res.recentServices[0];
            document.getElementById('invCustomerName').innerText = first.customer_name || 'Fleet Client';
            document.getElementById('invMeta').innerText = `${new Date(first.job_date).toLocaleDateString()} • #${first.job_id}`;
            document.getElementById('invCarModel').innerText = first.model || 'Commercial Fleet';
            document.getElementById('invTotalCost').innerText = `$${parseFloat(first.total_cost).toFixed(2)}`;
            document.getElementById('invDownloadBtn').dataset.jobId = first.job_id;

            const rest = res.recentServices.slice(1, 4);
            const secondaryList = document.getElementById('secondaryInvoicesList');
            if (secondaryList && rest.length > 0) {
                secondaryList.innerHTML = rest.map(r => `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-container/40 hover:bg-surface-container/70 transition-colors">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-label-sm text-label-sm font-semibold">
                                ${escapeHTML((r.customer_name || 'FC').slice(0, 2).toUpperCase())}
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="font-label-sm text-label-sm text-on-surface font-semibold truncate">${escapeHTML(r.customer_name || 'Client')} • #${escapeHTML(r.job_id)}</span>
                                <span class="text-[11px] text-on-surface-variant truncate">${escapeHTML(r.model || 'Vehicle')}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="font-label-md text-label-md text-on-surface font-bold">$${parseFloat(r.total_cost).toFixed(2)}</span>
                            <button aria-label="Download PDF" data-click="action14" data-arg0="${escapeHTML(r.job_id)}" class="text-secondary hover:text-secondary-fixed transition-colors" title="Download PDF">
                                <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        renderChart(res.revenueTrends || []);
        document.getElementById('lastUpdatedTime').innerText = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (err) {
        Toast.error(err.message || 'Error loading analytics telemetry');
    }
}

function renderChart(trendsData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = trendsData.map(t => t.date);
    const revenues = trendsData.map(t => parseFloat(t.revenue));

    const isDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
    const primaryColor = '#0050d7';
    const secondaryColor = '#2b69fa';
    const textColor = isDark ? '#94a3b8' : '#717785';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Completed Revenue ($)',
                data: revenues.length > 0 ? revenues : [2400, 3800, 4200, 5600, 7100, 8900, 11400],
                borderColor: primaryColor,
                backgroundColor: 'rgba(0, 80, 215, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: primaryColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: textColor,
                        font: { family: 'Inter', weight: '600', size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: textColor, font: { family: 'Inter', size: 11 } },
                    grid: { color: gridColor },
                    beginAtZero: true
                }
            }
        }
    });
}

function downloadInvoice(jobId) {
    window.open(`/api/services/${jobId}/invoice`, '_blank');
}

function logout() {
    API.logout();
}



const initializePage = loadAnalytics;
initializePage();
})().catch(error => Toast.error(error.message));
