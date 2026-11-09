window.Layout = {
  render(user) {
    const page = location.pathname.split('/').pop() || 'index.html';
    const links = [
      ['index.html', 'dashboard', 'Dashboard', ['admin', 'staff']],
      ['analytics.html', 'analytics', 'Analytics', ['admin', 'staff']],
      ['customer.html', 'group', 'Customers', ['admin', 'staff']],
      ['cars.html', 'directions_car', 'Vehicle Fleet', ['admin', 'staff']],
      ['services.html', 'build', 'Service Jobs', ['admin', 'staff', 'mechanic']],
      ['parts.html', 'inventory_2', 'Inventory Parts', ['admin', 'staff']],
      ['employee.html', 'badge', 'Employees', ['admin']]
    ].filter(link => link[3].includes(user.role));
    const nav = links.map(([href, icon, label]) => `<a class="layout-link ${page === href ? 'active' : ''}" href="${href}" aria-label="${label}" title="${label}" ${page === href ? 'aria-current="page"' : ''}><span class="material-symbols-outlined">${icon}</span><span class="layout-link-label">${label}</span></a>`).join('');
    const brand = '<a href="index.html" class="layout-brand" aria-label="Auto Repair Hub home" title="Auto Repair Hub"><img src="images/logo.webp" alt="" width="40" height="40"/><span class="layout-brand-name">Auto Repair Hub</span></a>';
    document.getElementById('sidebarSlot').innerHTML = `<aside class="layout-sidebar" aria-label="Expandable navigation">${brand}<nav aria-label="Main navigation">${nav}</nav><button class="btn btn-secondary layout-logout" data-layout="logout" aria-label="Log out" title="Log out"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H5v14h4M13 8l4 4-4 4M9 12h12"/></svg><span class="layout-logout-label">Log out</span></button></aside>`;
    document.getElementById('headerSlot').innerHTML = `<header class="layout-header"><button class="btn layout-mobile-toggle" data-layout="drawer" aria-label="Toggle navigation" aria-expanded="false"><span class="material-symbols-outlined">menu</span></button><span class="layout-title">${escapeHTML(links.find(link => link[0] === page)?.[2] || 'Auto Repair Hub')}</span><span id="userBadge">${escapeHTML(user.username)} (${escapeHTML(user.role)})</span><button class="btn btn-secondary theme-toggle-btn" data-layout="theme" aria-label="Switch theme"><span class="material-symbols-outlined">dark_mode</span></button></header>`;
    const search = document.getElementById('pageSearch');
    if (search) document.querySelector('.layout-header').insertBefore(search.content.cloneNode(true), document.getElementById('userBadge'));
    const slot = document.getElementById('drawerSlot');
    if (slot) slot.innerHTML = `<div id="mobileDrawer" class="layout-drawer hidden"><nav aria-label="Mobile navigation">${nav}</nav><button class="btn btn-secondary layout-logout" data-layout="logout" aria-label="Log out" title="Log out"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H5v14h4M13 8l4 4-4 4M9 12h12"/></svg><span class="layout-logout-label">Log out</span></button></div>`;
    document.getElementById('bottomNavSlot').innerHTML = `<nav class="layout-bottom" aria-label="Quick navigation">${nav}</nav>`;
    if (!this.bound) {
      document.addEventListener('click', event => {
        const button = event.target.closest('[data-layout]');
        if (!button) return;
        if (button.dataset.layout === 'logout') API.logout();
        if (button.dataset.layout === 'theme') API.toggleTheme();
        if (button.dataset.layout === 'drawer') {
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) { drawer.classList.toggle('hidden'); button.setAttribute('aria-expanded', String(!drawer.classList.contains('hidden'))); }
        }
      });
      this.bound = true;
    }
    API.updateThemeToggleUI(localStorage.getItem('theme') || 'light');
  }
};
