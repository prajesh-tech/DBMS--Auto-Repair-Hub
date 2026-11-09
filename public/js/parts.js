(async () => {
  const user = await API.requireAuth();
  if (!user) return;
  Layout.render(user);
  document.body.classList.add('auth-ready');

const actions = {
  action1: function(event) { API.toggleTheme() },
  action2: function(event) { logout() },
  action3: function(event) { toggleMobileNav() },
  action4: function(event) { document.getElementById('table-search').value = this.value; debounceSearch(); },
  action5: function(event) { document.getElementById('new-part-form').scrollIntoView({behavior: 'smooth'}) },
  action6: function(event) { event.stopPropagation() },
  action7: function(event) { document.getElementById('table-search').focus() },
  action8: function(event) { toggleLowStockFilter() },
  action9: function(event) { handleQuickAddPart(event) },
  action10: function(event) { debounceSearch() },
  action11: function(event) { loadParts(1) },
  action12: function(event) { refreshInventory() },
  action13: function(event) { changePage(-1) },
  action14: function(event) { changePage(1) },
  action15: function(event) { Toast.info('Displaying full supplier procurement history') },
  action16: function(event) { closeStockModal() },
  action17: function(event) { decrementStock() },
  action18: function(event) { incrementStock() },
  action19: function(event) { saveStockModal() },
  action21: function(event) { openStockModalById(Number(this.dataset.arg0)) },
  action22: function(event) { confirmDelete(Number(this.dataset.arg0)) }
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
let showLowStockOnly = false;
let partsDataMap = {};
let activeModalPartId = null;

async function loadParts(page = 1) {
    currentPage = page;
    const search = document.getElementById('table-search').value.trim();
    const lowStockParam = showLowStockOnly ? '&lowStock=true' : '';

    listState('inventory-table-body', 'loading', 'Loading records…');
    try {
        const res = await API.get(`/api/parts?page=${page}&limit=10&search=${encodeURIComponent(search)}${lowStockParam}`);
        const tbody = document.getElementById('inventory-table-body');

        totalPages = res.pagination.totalPages || 1;
        document.getElementById('paginationInfo').innerText = `Showing page ${res.pagination.page} of ${totalPages} (${res.pagination.total} total catalog items)`;
        document.getElementById('pageNumberDisplay').innerText = res.pagination.page;

        document.getElementById('prevBtn').disabled = currentPage <= 1;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages;

        if (!res.data || res.data.length === 0) {
            listState('inventory-table-body', 'empty', 'No records match your search.');
            return;
        }

        partsDataMap = {};
        let lowCount = 0;
        let stockedCount = 0;

        res.data.forEach(p => {
            partsDataMap[p.part_id] = p;
            if (p.stock_quantity <= p.min_stock_alert) {
                lowCount++;
            } else {
                stockedCount++;
            }
        });

        document.getElementById('statTotalCatalog').innerText = res.pagination.total || res.data.length;
        document.getElementById('statLowStockCount').innerText = lowCount;
        document.getElementById('statStockedCount').innerText = stockedCount;
        document.getElementById('lowStockHeaderBadge').innerText = lowCount;

        tbody.innerHTML = res.data.map(p => {
            const isLow = p.stock_quantity <= p.min_stock_alert;
            return `
                <tr class="part-row hover:bg-surface-container-low/50 transition-colors ${isLow ? 'bg-error-container/10' : ''}" data-name="${escapeHTML(p.part_name)}" data-sku="${escapeHTML(p.part_number)}" data-status="${isLow ? 'low' : 'ok'}">
                    <td class="py-3.5 px-4 font-mono font-semibold text-on-surface-variant">#${escapeHTML(p.part_id)}</td>
                    <td class="py-3.5 px-4">
                        <span class="inline-flex items-center px-2 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-mono text-[11px] font-semibold tracking-wide">
                            ${escapeHTML(p.part_number)}
                        </span>
                    </td>
                    <td class="py-3.5 px-4">
                        <div class="flex flex-col">
                            <span class="font-semibold text-on-surface text-sm">${escapeHTML(p.part_name)}</span>
                            <span class="text-[11px] text-on-surface-variant">General Warehouse • In-Stock</span>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface">
                        $${parseFloat(p.unit_price).toFixed(2)}
                    </td>
                    <td class="py-3.5 px-4">
                        ${isLow ? `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-error-container text-on-error-container animate-pulse">
                                <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
                                ${escapeHTML(p.stock_quantity)} LOW STOCK
                            </span>
                        ` : `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed">
                                <span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                                ${escapeHTML(p.stock_quantity)} in stock
                            </span>
                        `}
                    </td>
                    <td class="py-3.5 px-4 text-center font-mono ${isLow ? 'text-error font-semibold' : 'text-on-surface-variant'}">
                        ${escapeHTML(p.min_stock_alert)}
                    </td>
                    <td class="py-3.5 px-4 text-right">
                        <div class="inline-flex items-center gap-1.5">
                            <button class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer" data-click="action21" data-arg0="${escapeHTML(p.part_id)}" type="button" data-ui-action="edit">
                                <span class="material-symbols-outlined text-[14px]">edit</span>
                                <span>Edit Stock</span>
                            </button>
                            <button aria-label="Delete SKU" class="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container transition-colors cursor-pointer" data-click="action22" data-arg0="${escapeHTML(p.part_id)}" title="Delete SKU" type="button">
                                <span class="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        listState('inventory-table-body', 'error', 'Could not load records.', () => loadParts(currentPage));
        Toast.error(err.message || 'Failed to load inventory');
    }
}

function changePage(delta) {
    const target = currentPage + delta;
    if (target >= 1 && target <= totalPages) {
        loadParts(target);
    }
}

function toggleLowStockFilter() {
    showLowStockOnly = !showLowStockOnly;
    const btn = document.getElementById('low-stock-toggle');
    if (showLowStockOnly) {
        btn.classList.add('bg-error-container', 'text-on-error-container');
        btn.classList.remove('bg-surface-container', 'text-on-surface');
    } else {
        btn.classList.remove('bg-error-container', 'text-on-error-container');
        btn.classList.add('bg-surface-container', 'text-on-surface');
    }
    loadParts(1);
}

function refreshInventory() {
    loadParts(currentPage);
    Toast.info('Inventory catalog refreshed from database');
}

const debounceSearch = debounce(() => {
    loadParts(1);
}, 300);

async function handleQuickAddPart(e) {
    e.preventDefault();
    const part_name = document.getElementById('input-name').value.trim();
    const part_number = document.getElementById('input-sku').value.trim().toUpperCase();
    const unit_price = parseFloat(document.getElementById('input-price').value);
    const stock_quantity = parseInt(document.getElementById('input-qty').value, 10);
    const min_stock_alert = parseInt(document.getElementById('input-min').value, 10);

    if (!part_name || !part_number) return;

    try {
        await API.post('/api/parts', { part_name, part_number, unit_price, stock_quantity, min_stock_alert });
        Toast.success('Inventory part registered successfully!');
        document.getElementById('new-part-form').reset();
        document.getElementById('input-min').value = '5';
        loadParts(1);
    } catch (err) {
        Toast.error(err.message || 'Failed to add inventory part');
    }
}

let releaseStockFocus;
function openStockModalById(id) {
    const p = partsDataMap[id];
    if (!p) return;
    activeModalPartId = id;
    document.getElementById('modal-part-name').textContent = p.part_name;
    document.getElementById('modal-part-sku').textContent = 'SKU: ' + p.part_number;
    document.getElementById('modal-qty-input').value = p.stock_quantity;
    document.body.appendChild(document.getElementById('stock-modal'));
    document.getElementById('stock-modal').classList.remove('hidden');
    releaseStockFocus = trapDialogFocus(document.getElementById('stock-modal'), closeStockModal);
}

function closeStockModal() {
    if (releaseStockFocus) { releaseStockFocus(); releaseStockFocus = null; }
    document.getElementById('stock-modal').classList.add('hidden');
}

function incrementStock() {
    const input = document.getElementById('modal-qty-input');
    input.value = parseInt(input.value || 0, 10) + 1;
}

function decrementStock() {
    const input = document.getElementById('modal-qty-input');
    const val = parseInt(input.value || 0, 10);
    if (val > 0) input.value = val - 1;
}

async function saveStockModal() {
    const newQty = parseInt(document.getElementById('modal-qty-input').value, 10);
    if (!isNaN(newQty) && activeModalPartId) {
        const p = partsDataMap[activeModalPartId];
        try {
            await API.put(`/api/parts/${activeModalPartId}`, {
                part_name: p.part_name,
                part_number: p.part_number,
                unit_price: p.unit_price,
                stock_quantity: newQty,
                min_stock_alert: p.min_stock_alert
            });
            Toast.success('Stock quantity updated in MariaDB');
            closeStockModal();
            loadParts(currentPage);
        } catch (err) {
            Toast.error(err.message || 'Failed to update stock');
        }
    }
}

function confirmDelete(id) {
    const p = partsDataMap[id];
    Modal.confirm({
        title: 'Delete Inventory Part',
        message: `Are you sure you want to delete ${p ? p.part_name : 'this part'}?`,
        onConfirm: async () => {
            try {
                await API.delete(`/api/parts/${id}`);
                Toast.success('Part deleted from inventory');
                loadParts(currentPage);
            } catch (err) {
                Toast.error(err.message || 'Failed to delete part');
            }
        }
    });
}

function logout() {
    API.logout();
}



const initializePage = () => loadParts(1);
initializePage();
})().catch(error => Toast.error(error.message));
