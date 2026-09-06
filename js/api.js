/* ==========================================================================
   Nexova Store — API helper wrapper around the RESTful Table API
   ========================================================================== */

// Resolve the site root that this script itself was loaded from. This works
// regardless of how deep the calling page is nested (site root or /admin/*),
// and regardless of whether the whole site is served under a URL prefix
// (as happens in the preview environment), because the browser has already
// resolved this <script> tag's src to an absolute URL by the time this file
// runs — so we anchor every API call to that same absolute base instead of
// using a plain relative path (breaks under /admin/) or a leading-slash
// absolute path (breaks when the site itself lives under a URL prefix).
const __API_BASE = (function () {
  var scriptEl = document.currentScript;
  if (!scriptEl) {
    // Fallback: find any script tag pointing at this file.
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      if (/(^|\/)js\/api\.js$/.test(scripts[i].src)) { scriptEl = scripts[i]; break; }
    }
  }
  var src = scriptEl ? scriptEl.src : (location.origin + '/js/api.js');
  // Strip the trailing "js/api.js" to get the site root, with trailing slash.
  return src.replace(/js\/api\.js(\?.*)?$/, '');
})();

const API = {
  async list(table, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${__API_BASE}tables/${table}${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error(`Failed to load ${table}`);
    return res.json();
  },

  async get(table, id) {
    const res = await fetch(`${__API_BASE}tables/${table}/${id}`);
    if (!res.ok) throw new Error(`Failed to load ${table}/${id}`);
    return res.json();
  },

  async create(table, data) {
    const res = await fetch(`${__API_BASE}tables/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to create ${table}`);
    return res.json();
  },

  async update(table, id, data) {
    // NOTE: the live deployed Worker's CORS policy does not allow the PATCH
    // method (browsers block it at preflight), but PUT is allowed. PUT
    // replaces the whole record, so fetch the current record first and
    // merge the partial update into it before sending.
    let current = {};
    try {
      current = await this.get(table, id);
    } catch (e) {
      current = {};
    }
    const merged = { ...current, ...data };
    const res = await fetch(`${__API_BASE}tables/${table}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });
    if (!res.ok) throw new Error(`Failed to update ${table}/${id}`);
    return res.json();
  },

  async remove(table, id) {
    const res = await fetch(`${__API_BASE}tables/${table}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error(`Failed to delete ${table}/${id}`);
    return true;
  },

  // Fetch ALL rows across pages (table API defaults to page limits)
  async listAll(table, extraParams = {}) {
    let page = 1;
    const limit = 100;
    let all = [];
    while (true) {
      const data = await this.list(table, { ...extraParams, page, limit });
      all = all.concat(data.data || []);
      if (!data.data || data.data.length < limit || all.length >= (data.total || all.length)) break;
      page++;
      if (page > 50) break; // safety
    }
    return all;
  }
};

let __settingsCache = null;
async function getSettings() {
  if (__settingsCache) return __settingsCache;
  try {
    const s = await API.get('settings', 'store_settings');
    __settingsCache = s;
    return s;
  } catch (e) {
    __settingsCache = { store_name: 'WigsbyAmah', currency_symbol: '$', admin_username: 'admin', admin_password: 'admin123' };
    return __settingsCache;
  }
}

function fmtPrice(amount, symbol) {
  const sym = symbol || (window.__currencySymbol || '$');
  const n = Number(amount || 0);
  return `${sym}${n.toFixed(2)}`;
}

function genOrderNumber() {
  const n = Math.floor(1000 + Math.random() * 8999);
  return `ORD-${n}-${Date.now().toString().slice(-4)}`;
}
