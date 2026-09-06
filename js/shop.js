/* ==========================================================================
   Nexova Store — Shop / Listing page logic with filters
   ========================================================================== */

let __allProducts = [];
let __allVariations = [];

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function applyFiltersAndRender() {
  const typeVal = document.querySelector('input[name="type"]:checked')?.value || '';
  const catVal = document.querySelector('input[name="category"]:checked')?.value || '';
  const maxPrice = Number(document.getElementById('priceRange').value);
  const sortVal = document.getElementById('sortSelect').value;
  const searchQ = (getQueryParam('q') || '').toLowerCase();

  let filtered = __allProducts.filter(p => p.status !== 'inactive');
  if (typeVal) filtered = filtered.filter(p => p.product_type === typeVal);
  if (catVal) filtered = filtered.filter(p => p.category === catVal);
  filtered = filtered.filter(p => p.price <= maxPrice);
  if (searchQ) filtered = filtered.filter(p =>
    p.name.toLowerCase().includes(searchQ) ||
    (p.category || '').toLowerCase().includes(searchQ) ||
    (p.description || '').toLowerCase().includes(searchQ)
  );

  if (sortVal === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (sortVal === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (sortVal === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name));

  const grid = document.getElementById('productGrid');
  document.getElementById('resultCount').textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'} found`;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class="fa-solid fa-magnifying-glass"></i><h3>No products found</h3><p>Try adjusting your filters or search terms.</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(p => productCardHtml(p, window.__currencySymbol)).join('');
}

function productMaxFilterPrice(product) {
  const basePrice = Number(product.price || 0);
  const variantPrices = __allVariations
    .filter(v => v.product_id === product.id && v.variant_prices && typeof v.variant_prices === 'object')
    .flatMap(v => Object.values(v.variant_prices).map(Number).filter(price => price > 0));
  return Math.max(basePrice, ...variantPrices);
}

function updatePriceRangeLabel() {
  const priceRange = document.getElementById('priceRange');
  document.getElementById('priceRangeVal').textContent = fmtPrice(Number(priceRange.value || 0), window.__currencySymbol);
}

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('shop');
  const settings = await getSettings();
  window.__currencySymbol = settings.currency_symbol || '$';

  try {
    __allProducts = await API.listAll('products');
  } catch (e) {
    console.error(e);
    document.getElementById('productGrid').innerHTML = '<p style="color:var(--danger);">Could not load products.</p>';
    return;
  }

  try {
    __allVariations = await API.listAll('product_variations');
  } catch (e) {
    __allVariations = [];
  }

  // Build category filters — prefer admin-managed categories (with custom
  // order), fall back to categories derived from product data.
  let cats = [];
  try {
    const adminCats = (await API.listAll('categories')).filter(c => c.status !== 'inactive');
    adminCats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    cats = adminCats.map(c => c.name).filter(Boolean);
  } catch (e) { /* categories table may not exist yet */ }
  if (!cats.length) {
    cats = [...new Set(__allProducts.map(p => p.category).filter(Boolean))].sort();
  }
  const catContainer = document.getElementById('categoryFilters');
  cats.forEach(c => {
    const label = document.createElement('label');
    label.className = 'filter-option';
    label.innerHTML = `<input type="radio" name="category" value="${escapeHtml(c)}"> ${escapeHtml(c)}`;
    catContainer.appendChild(label);
  });

  // Set max price range based on data
  const maxPriceInData = Math.max(...__allProducts.map(productMaxFilterPrice), 100);
  const priceRange = document.getElementById('priceRange');
  priceRange.max = Math.ceil(maxPriceInData / 1000) * 1000;
  priceRange.step = '1000';
  priceRange.value = priceRange.max;
  updatePriceRangeLabel();

  // Apply URL params
  const typeParam = getQueryParam('type');
  const catParam = getQueryParam('category');
  const searchQ = getQueryParam('q');
  if (typeParam) {
    const el = document.querySelector(`input[name="type"][value="${typeParam}"]`);
    if (el) el.checked = true;
  }
  if (catParam) {
    const el = document.querySelector(`input[name="category"][value="${catParam}"]`);
    if (el) el.checked = true;
  }

  // Update heading
  if (typeParam === 'pre_order') {
    document.getElementById('shopHeading').textContent = 'Pre-Order Products';
    document.getElementById('shopSubheading').textContent = 'Reserve upcoming releases before they launch.';
    document.getElementById('pageTitleCrumb').textContent = 'Pre-Orders';
  } else if (typeParam === 'in_stock') {
    document.getElementById('shopHeading').textContent = 'In-Stock Products';
    document.getElementById('shopSubheading').textContent = 'Ready to ship right now.';
    document.getElementById('pageTitleCrumb').textContent = 'In Stock';
  } else if (searchQ) {
    document.getElementById('shopHeading').textContent = `Search results for "${searchQ}"`;
    document.getElementById('shopSubheading').textContent = '';
  }

  // Wire up events
  document.querySelectorAll('input[name="type"], input[name="category"]').forEach(el =>
    el.addEventListener('change', applyFiltersAndRender)
  );
  priceRange.addEventListener('input', () => {
    updatePriceRangeLabel();
    applyFiltersAndRender();
  });
  document.getElementById('sortSelect').addEventListener('change', applyFiltersAndRender);
  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.querySelector('input[name="type"][value=""]').checked = true;
    document.querySelector('input[name="category"][value=""]').checked = true;
    priceRange.value = priceRange.max;
    updatePriceRangeLabel();
    document.getElementById('sortSelect').value = 'default';
    window.history.replaceState({}, '', 'shop.html');
    applyFiltersAndRender();
  });

  applyFiltersAndRender();
});
