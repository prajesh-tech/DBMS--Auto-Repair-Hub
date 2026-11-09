const fs = require('fs');
const path = require('path');
const vm = require('vm');
const request = require('supertest');
jest.mock('../src/config/database', () => ({ query: jest.fn(), getConnection: jest.fn(), end: jest.fn() }));
const app = require('../src/server');

it('escapes all five HTML metacharacters', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('public/js/common.js', 'utf8'), context);
  expect(context.window.escapeHTML('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  expect(context.window.escapeHTML(0)).toBe('0');
});
it('serves a strict CSP and HTML cache revalidation', async () => {
  const res = await request(app).get('/login.html');
  expect(res.status).toBe(200);
  const csp = res.headers['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src-attr 'none'");
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https:/);
  expect(res.headers['cache-control']).toBe('no-cache');
});
it('has no executable inline code, styles, or remotely loaded assets on any page', () => {
  const pages = fs.readdirSync('public').filter(file => file.endsWith('.html'));
  for (const page of pages) {
    const html = fs.readFileSync(path.join('public', page), 'utf8');
    expect(html).not.toMatch(/\son\w+\s*=/i);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/\sstyle\s*=|<style\b/i);
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//);
  }
});
it('escapes confirmation text before placing it in HTML', () => {
  let options;
  const context = { window: {}, escapeHTML: value => String(value).replace(/</g, '&lt;') };
  vm.runInNewContext(fs.readFileSync('public/js/modal.js', 'utf8'), context);
  context.window.Modal.open = value => { options = value; };
  context.window.Modal.confirm({ message: '<img src=x onerror=alert(1)>' });
  expect(options.bodyHTML).not.toContain('<img');
});
it('shares a single refresh request across simultaneous 401 responses', async () => {
  let refreshCalls = 0;
  const context = {
    window: { location: { pathname: '/services.html' } },
    document: { cookie: 'csrf_token=test', addEventListener: () => {} },
    sessionStorage: { setItem: () => {}, removeItem: () => {}, getItem: () => null },
    console,
    fetch: jest.fn(async (url, options) => {
      if (url === '/api/auth/refresh') {
        refreshCalls++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { ok: true, json: async () => ({ user: { role: 'mechanic' } }) };
      }
      if (!options.headers.Retried) {
        options.headers.Retried = true;
        return { status: 401, ok: false };
      }
      return { status: 200, ok: true, json: async () => ({ success: true }) };
    })
  };
  // API.request rebuilds headers for a retry, so count responses per endpoint instead.
  const counts = {};
  const originalFetch = context.fetch;
  context.fetch = (url, options) => {
    if (url !== '/api/auth/refresh' && (counts[url] = (counts[url] || 0) + 1) > 1) options.headers.Retried = true;
    return originalFetch(url, options);
  };
  vm.runInNewContext(fs.readFileSync('public/js/api.js', 'utf8'), context);
  await Promise.all([context.window.API.get('/api/services'), context.window.API.get('/api/other')]);
  expect(refreshCalls).toBe(1);
});

it('initializes theme without referencing removed navigation helpers', () => {
  const context = {
    window: {}, document: { addEventListener: () => {}, querySelectorAll: () => [], documentElement: { setAttribute: jest.fn(), classList: { toggle: jest.fn() } } },
    localStorage: { getItem: () => 'dark' }
  };
  vm.runInNewContext(fs.readFileSync('public/js/api.js', 'utf8'), context);
  expect(() => context.window.API.initTheme()).not.toThrow();
  expect(context.document.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true);
});

it('resolves every local page image, script and stylesheet', () => {
  for (const page of fs.readdirSync('public').filter(file => file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join('public', page), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|javascript:)/.test(match[1])) continue;
      expect(fs.existsSync(path.join('public', match[1].split('?')[0]))).toBe(true);
    }
  }
});

it('revalidates shared CSS and JavaScript instead of retaining stale UI for a day', async () => {
  for (const file of ['/css/style.css', '/css/ui.css', '/js/api.js', '/js/layout.js']) {
    const res = await request(app).get(file);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  }
});

it('independently shows and hides all three password-change fields', () => {
  const fields = Object.fromEntries(['cpCurrent', 'cpNew', 'cpConfirm'].map(id => [id, {
    type: 'password', labels: [{ textContent: id === 'cpCurrent' ? 'Current password' : id === 'cpNew' ? 'New password' : 'Confirm new password' }], focus: jest.fn()
  }]));
  const buttons = Object.keys(fields).map(id => ({
    dataset: { passwordToggle: id }, attributes: {}, icon: { textContent: 'visibility' },
    addEventListener(name, callback) { this[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector() { return this.icon; }
  }));
  const overlay = {
    classList: { add: jest.fn() }, setAttribute: jest.fn(),
    querySelector: selector => selector === '#cpCurrent' ? fields.cpCurrent : { setAttribute: jest.fn() },
    querySelectorAll: () => buttons
  };
  const context = {
    window: {}, document: { addEventListener: () => {}, getElementById: id => fields[id] || null },
    Modal: { overlay, open: jest.fn() }
  };
  vm.runInNewContext(fs.readFileSync('public/js/api.js', 'utf8'), context);
  context.window.API.showChangePasswordModal();
  expect(context.Modal.open.mock.calls[0][0].bodyHTML.match(/data-password-toggle=/g)).toHaveLength(3);
  for (const button of buttons) {
    button.click();
    expect(fields[button.dataset.passwordToggle].type).toBe('text');
    expect(button.attributes['aria-pressed']).toBe('true');
    expect(button.icon.textContent).toBe('visibility_off');
    button.click();
    expect(fields[button.dataset.passwordToggle].type).toBe('password');
    expect(button.attributes['aria-pressed']).toBe('false');
  }
  expect(fields.cpCurrent.focus).toHaveBeenCalled();
});
