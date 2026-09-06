/* ==========================================================================
   Amah Wigs — Home page logic
   ========================================================================== */

// Best-effort icon mapping for category names -> Font Awesome icons
const CATEGORY_ICON_MAP = {
  leggings: 'fa-person-walking', hoodies: 'fa-shirt', hoodie: 'fa-shirt',
  tanks: 'fa-shirt', tank: 'fa-shirt', 'bike shorts': 'fa-person-biking',
  joggers: 'fa-person-running', jogger: 'fa-person-running', cardigan: 'fa-shirt',
  'sports bra': 'fa-dumbbell', sweatshirt: 'fa-shirt', 'wide-leg pants': 'fa-shirt',
  windbreaker: 'fa-cloud-sun', jacket: 'fa-cloud-sun', dresses: 'fa-person-dress',
  dress: 'fa-person-dress', sets: 'fa-layer-group', activewear: 'fa-dumbbell',
  bodysuit: 'fa-shirt', tunic: 'fa-shirt', 'crop top': 'fa-shirt',
  loungewear: 'fa-couch', accessories: 'fa-gem', default: 'fa-shirt'
};

function iconForCategory(cat) {
  if (!cat) return CATEGORY_ICON_MAP.default;
  const key = cat.toLowerCase().trim();
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];
  // partial match
  for (const k in CATEGORY_ICON_MAP) {
    if (key.includes(k)) return CATEGORY_ICON_MAP[k];
  }
  return CATEGORY_ICON_MAP.default;
}

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('home');
  const settings = await getSettings();
  window.__currencySymbol = settings.currency_symbol || '$';

  const content = await getSiteContent();
  applySiteContentToDom(content);

  try {
    const products = await API.listAll('products');
    const active = products.filter(p => p.status !== 'inactive');

    // Featured
    const featured = active.filter(p => p.featured).slice(0, 8);
    const featuredList = featured.length ? featured : active.slice(0, 8);
    document.getElementById('featuredGrid').innerHTML = featuredList.map(p => productCardHtml(p, window.__currencySymbol)).join('') || '<p>No products yet.</p>';

    // Pre-order spotlight
    const preorders = active.filter(p => p.product_type === 'pre_order').slice(0, 4);
    document.getElementById('preorderGrid').innerHTML = preorders.length
      ? preorders.map(p => productCardHtml(p, window.__currencySymbol)).join('')
      : '<p style="color:var(--gray-500);">No pre-orders available right now.</p>';

    // Categories — icon circles (FakultyNG style). Prefer admin-managed
    // categories (with custom icon/order); fall back to categories
    // derived from product data if none have been configured yet.
    let cats = [];
    try {
      const adminCats = (await API.listAll('categories')).filter(c => c.status !== 'inactive');
      adminCats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      cats = adminCats.map(c => ({ name: c.name, icon: c.icon || iconForCategory(c.name) }));
    } catch (e) { /* categories table may not exist yet */ }
    if (!cats.length) {
      const derived = [...new Set(active.map(p => p.category).filter(Boolean))];
      cats = derived.map(c => ({ name: c, icon: iconForCategory(c) }));
    }
    document.getElementById('categoryChips').innerHTML = cats.length ? cats.map(c => `
      <a href="shop.html?category=${encodeURIComponent(c.name)}" class="category-icon-item">
        <div class="category-icon-circle"><i class="fa-solid ${c.icon}"></i></div>
        <span class="category-icon-label">${escapeHtml(c.name)}</span>
      </a>`).join('') : '<span style="color:var(--gray-500);">No categories yet.</span>';

  } catch (e) {
    console.error(e);
    document.getElementById('featuredGrid').innerHTML = '<p style="color:var(--danger);">Could not load products.</p>';
  }
});
