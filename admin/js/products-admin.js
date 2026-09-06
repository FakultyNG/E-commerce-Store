/* ==========================================================================
   Amah Wigs — Admin Products CRUD logic
   Includes: photo/video upload (client-side compressed/chunked to fit the
   Table API's per-field size cap — see js/media-utils.js), drag-to-reorder
   gallery, color/size variation groups editor, and a category picker with
   an inline "quick add" flow.
   ========================================================================== */

const MAX_IMAGE_BYTES = MEDIA_MAX_IMAGE_BYTES;   // 5MB (raw upload limit)
const MAX_VIDEO_BYTES = MEDIA_MAX_VIDEO_BYTES;   // 25MB (raw upload limit)

let __adminProducts = [];
let __currencySymbol = '$';
let __adminCategoriesCache = [];

// In-memory state for the product currently open in the modal.
// Each media item: { id, media_type: 'image'|'video', url, is_chunked, _file (pending File to upload), sort_order, _isNew, _deleted }
let __currentMedia = [];
let __deletedMediaIds = [];
// Each variation group: { id, group_name, group_values: [...], variant_prices: { [value]: price }, sort_order, _isNew, _deleted }
let __currentVariations = [];
let __deletedVariationIds = [];

let __allMediaCache = null;
let __allVariationsCache = null;

async function loadAllMediaAndVariations() {
  try {
    __allMediaCache = await API.listAll('product_media');
  } catch (e) { __allMediaCache = []; }
  try {
    __allVariationsCache = await API.listAll('product_variations');
  } catch (e) { __allVariationsCache = []; }
}

async function loadCategories() {
  try {
    __adminCategoriesCache = await API.listAll('categories');
    __adminCategoriesCache.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  } catch (e) { __adminCategoriesCache = []; }
}

function populateCategorySelect(selectedValue) {
  const select = document.getElementById('categorySelect');
  const opts = ['<option value="">— No category —</option>', '<option value="__add_new__">+ Add New Category…</option>'];
  __adminCategoriesCache.filter(c => c.status !== 'inactive').forEach(c => {
    opts.push(`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`);
  });
  select.innerHTML = opts.join('');
  // If the product's saved category isn't in the active list (e.g. inactive
  // or legacy free-text category), add it so it doesn't silently blank out.
  if (selectedValue && !__adminCategoriesCache.some(c => c.name === selectedValue)) {
    select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(selectedValue)}">${escapeHtml(selectedValue)} (unlisted)</option>`);
  }
  select.value = selectedValue || '';
}

function openQuickAddCategoryModal() {
  document.getElementById('quickCategoryForm').reset();
  document.getElementById('quickIconPreview').className = 'fa-solid fa-shirt';
  document.getElementById('quick_icon').value = '';
  document.getElementById('quickAddCategoryModal').classList.add('show');
  setTimeout(() => document.getElementById('quickCategoryName').focus(), 50);
}
function closeQuickAddCategoryModal() {
  document.getElementById('quickAddCategoryModal').classList.remove('show');
  // If the user cancelled without adding a category, reset the select away
  // from the "+ Add New Category…" option back to blank.
  const select = document.getElementById('categorySelect');
  if (select.value === '__add_new__') select.value = '';
}

async function handleQuickAddCategorySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('saveQuickCategoryBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

  const name = form.quick_name.value.trim();
  const icon = form.quick_icon.value || '';
  if (!name) { btn.disabled = false; btn.innerHTML = 'Add Category'; return; }

  try {
    const payload = {
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name, icon, image_url: '', sort_order: __adminCategoriesCache.length, status: 'active'
    };
    const created = await API.create('categories', payload);
    __adminCategoriesCache.push(created);
    populateCategorySelect(created.name);
    document.getElementById('categorySelect').value = created.name;
    closeQuickAddCategoryModal();
    showAdminToast('Category added');
  } catch (err) {
    console.error(err);
    showAdminToast('Failed to add category', 'fa-triangle-exclamation');
  }
  btn.disabled = false;
  btn.innerHTML = 'Add Category';
}

function renderProductsTable() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const typeVal = document.getElementById('typeFilter').value;
  const statusVal = document.getElementById('statusFilter').value;

  let filtered = __adminProducts.filter(p => {
    if (search && !(p.name.toLowerCase().includes(search) || (p.sku || '').toLowerCase().includes(search))) return false;
    if (typeVal && p.product_type !== typeVal) return false;
    if (statusVal && p.status !== statusVal) return false;
    return true;
  });

  const body = document.getElementById('productsBody');
  if (!filtered.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="7">No products found.</td></tr>';
    return;
  }

  body.innerHTML = filtered.map(p => {
    const isPreorder = p.product_type === 'pre_order';
    const outOfStock = !isPreorder && (p.stock_quantity || 0) <= 0;
    const lowStock = !isPreorder && p.stock_quantity > 0 && p.stock_quantity <= 5;
    let stockCell = isPreorder
      ? `<span class="pill pill-amber">${p.stock_quantity} reserved</span>`
      : outOfStock ? `<span class="pill pill-red">Out of stock</span>`
      : lowStock ? `<span class="pill pill-amber">${p.stock_quantity} left</span>`
      : `<span class="pill pill-green">${p.stock_quantity} in stock</span>`;

    return `
    <tr>
      <td><div class="table-prod-cell"><img src="${p.image_url}" alt="" loading="lazy" onerror="this.onerror=null;this.src='../images/logo.png';"><div><div style="font-weight:700;">${escapeHtml(p.name)}</div><div style="font-size:11.5px;color:var(--gray-500);">SKU: ${escapeHtml(p.sku || '—')}</div></div></div></td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td>${fmtPrice(p.price, __currencySymbol)}${p.compare_at_price ? `<br><span style="text-decoration:line-through;color:var(--gray-500);font-size:12px;">${fmtPrice(p.compare_at_price, __currencySymbol)}</span>` : ''}</td>
      <td>${stockCell}</td>
      <td>${isPreorder ? '<span class="pill pill-amber"><i class="fa-solid fa-clock"></i> Pre-Order</span>' : '<span class="pill pill-green"><i class="fa-solid fa-check"></i> In Stock</span>'}</td>
      <td>${p.status === 'active' ? '<span class="pill pill-indigo">Active</span>' : '<span class="pill pill-gray">Inactive</span>'}</td>
      <td>
        <button class="btn btn-outline btn-sm" data-edit="${p.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" data-delete="${p.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openProductModal(btn.getAttribute('data-edit'))));
  body.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-delete'))));
}

function toggleTypeFields() {
  const type = document.getElementById('productTypeSelect').value;
  const isPreorder = type === 'pre_order';
  document.getElementById('depositGroup').style.display = isPreorder ? 'block' : 'none';
  document.getElementById('releaseDateGroup').style.display = isPreorder ? 'block' : 'none';
  document.getElementById('stockLabel').textContent = isPreorder ? 'Units Available to Reserve *' : 'Stock Quantity *';
  document.getElementById('stockHint').textContent = isPreorder ? 'How many units are available for pre-order reservation.' : 'Units currently in inventory.';
}

/* ---------------------------------------------------------------------- *
 *  Media (photo/video) manager
 * ---------------------------------------------------------------------- */

function genLocalId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

async function handleMediaFilesSelected(fileList) {
  const statusEl = document.getElementById('mediaUploadStatus');
  const files = Array.from(fileList);
  let addedCount = 0, rejectedCount = 0;
  const rejections = [];

  // Only one video per product — if one already exists (and isn't being
  // removed), reject any additional video file up front.
  const hasVideoAlready = __currentMedia.some(m => !m._deleted && m.media_type === 'video');
  let videoAddedThisBatch = hasVideoAlready;

  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      rejectedCount++;
      rejections.push(`${file.name}: unsupported file type`);
      continue;
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      rejectedCount++;
      rejections.push(`${file.name}: ${formatBytes(file.size)} exceeds the 5MB photo limit`);
      continue;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      rejectedCount++;
      rejections.push(`${file.name}: ${formatBytes(file.size)} exceeds the 25MB video limit`);
      continue;
    }
    if (isVideo && videoAddedThisBatch) {
      rejectedCount++;
      rejections.push(`${file.name}: only one video per product is supported — remove the existing video first`);
      continue;
    }

    try {
      if (isImage) {
        statusEl.textContent = `Compressing ${file.name}...`;
        const dataUrl = await compressImageFile(file);
        __currentMedia.push({
          id: genLocalId('media'),
          media_type: 'image',
          url: dataUrl,
          is_chunked: false,
          sort_order: __currentMedia.length,
          _isNew: true
        });
      } else {
        // Video: keep the raw File around; it's uploaded (chunked) at save
        // time so we don't do a slow chunk-upload for a product the admin
        // might still cancel.
        __currentMedia.push({
          id: genLocalId('media'),
          media_type: 'video',
          url: '',
          is_chunked: false,
          _file: file,
          _fileName: file.name,
          sort_order: __currentMedia.length,
          _isNew: true
        });
        videoAddedThisBatch = true;
      }
      addedCount++;
    } catch (e) {
      console.error(e);
      rejectedCount++;
      rejections.push(e.message || `${file.name}: failed to process file`);
    }
  }

  statusEl.textContent = '';
  if (addedCount) showAdminToast(`${addedCount} file${addedCount === 1 ? '' : 's'} added`);
  if (rejectedCount) {
    showAdminToast(rejections.join(' · '), 'fa-triangle-exclamation');
  }
  renderMediaList();
}

function renderMediaList() {
  const list = document.getElementById('mediaList');
  const visible = __currentMedia.filter(m => !m._deleted);

  if (!visible.length) {
    list.innerHTML = '<p style="font-size:12.5px;color:var(--gray-500);margin-top:10px;">No photos or video added yet.</p>';
    return;
  }

  // Cover = first image (not video) in order.
  const firstImageIdx = visible.findIndex(m => m.media_type === 'image');

  list.innerHTML = visible.map((m, idx) => {
    const isCover = idx === firstImageIdx;
    let thumb;
    if (m.media_type === 'video') {
      thumb = m._file
        ? `<div class="media-thumb media-video-pending"><i class="fa-solid fa-file-video"></i></div>`
        : `<video class="media-thumb" muted draggable="false"></video>`;
    } else {
      thumb = `<img class="media-thumb" src="${m.url}" alt="" draggable="false">`;
    }
    return `
    <div class="media-item ${isCover ? 'cover' : ''}" draggable="true" data-media-id="${m.id}">
      ${m.media_type === 'video' ? `<span class="media-video-badge"><i class="fa-solid fa-video"></i> Video${m._file ? ' (pending)' : ''}</span>` : ''}
      ${isCover ? '<span class="cover-badge">Cover</span>' : ''}
      ${thumb}
      <div class="media-item-controls">
        <button type="button" class="drag-handle" title="Drag to reorder" draggable="false" style="cursor:grab;"><i class="fa-solid fa-up-down-left-right"></i></button>
        <button type="button" class="danger" data-remove-media="${m.id}" title="Remove" draggable="false"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');

  // Set video src via JS (loads already-saved chunked videos lazily) to
  // avoid huge data-URLs inline as HTML attribute strings.
  visible.forEach(m => {
    if (m.media_type === 'video' && !m._file) {
      const el = list.querySelector(`[data-media-id="${m.id}"] video`);
      if (!el) return;
      if (m.is_chunked) {
        loadVideoBlobUrl(m.id).then(blobUrl => { if (blobUrl) el.src = blobUrl; }).catch(() => {});
      } else if (m.url) {
        el.src = m.url;
      }
    }
  });

  list.querySelectorAll('[data-remove-media]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-remove-media');
      const item = __currentMedia.find(m => m.id === id);
      if (item) {
        if (item._isNew) {
          __currentMedia = __currentMedia.filter(m => m.id !== id);
        } else {
          item._deleted = true;
          __deletedMediaIds.push(id);
        }
      }
      renderMediaList();
    });
  });

  wireMediaDragReorder(list);
}

function wireMediaDragReorder(list) {
  let dragEl = null;
  list.querySelectorAll('.media-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragEl = item;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', item.getAttribute('data-media-id')); } catch (err) {}
      }
      setTimeout(() => item.style.opacity = '0.4', 0);
    });
    item.addEventListener('dragend', () => {
      item.style.opacity = '1';
      dragEl = null;
      const ids = Array.from(list.querySelectorAll('.media-item')).map(el => el.getAttribute('data-media-id'));
      ids.forEach((id, idx) => {
        const m = __currentMedia.find(x => x.id === id);
        if (m) m.sort_order = idx;
      });
      renderMediaList();
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragEl || dragEl === item) return;
      const rect = item.getBoundingClientRect();
      const next = (e.clientX - rect.left) / rect.width > 0.5;
      list.insertBefore(dragEl, next ? item.nextSibling : item);
    });
  });
}

/* ---------------------------------------------------------------------- *
 *  Variation groups manager
 * ---------------------------------------------------------------------- */

function renderVariationGroups() {
  const wrap = document.getElementById('variationGroups');
  const visible = __currentVariations.filter(v => !v._deleted);

  if (!visible.length) {
    wrap.innerHTML = '<p style="font-size:12.5px;color:var(--gray-500);margin-bottom:10px;">No variation groups yet.</p>';
    return;
  }

  wrap.innerHTML = visible.map(v => {
    const values = Array.isArray(v.group_values) ? v.group_values : [];
    const prices = v.variant_prices && typeof v.variant_prices === 'object' ? v.variant_prices : {};
    const priceEnabled = !!v._priceEnabled || Object.keys(prices).length > 0;
    v._priceEnabled = priceEnabled;
    v.variant_prices = prices;
    return `
    <div class="variation-group-card" data-vg-id="${v.id}">
      <div class="vg-head">
        <input type="text" placeholder="Group name e.g. Color" value="${escapeHtml(v.group_name || '')}" data-vg-name="${v.id}">
        <button type="button" class="vg-remove" data-vg-remove="${v.id}" title="Remove group"><i class="fa-solid fa-trash"></i></button>
      </div>
      <label class="checkbox-row vg-price-toggle">
        <input type="checkbox" data-vg-price-toggle="${v.id}" ${priceEnabled ? 'checked' : ''}>
        Add variant amount
      </label>
      <div class="vg-values-row ${priceEnabled ? 'has-price' : ''}">
        <input type="text" placeholder="Type a value and press Enter (e.g. Red)" data-vg-value-input="${v.id}">
        <input type="number" step="0.01" min="0" placeholder="Variant price" data-vg-price-input="${v.id}" style="${priceEnabled ? '' : 'display:none;'}">
        <button type="button" class="btn btn-outline btn-sm" data-vg-add-value="${v.id}"><i class="fa-solid fa-plus"></i> Add</button>
      </div>
      <div class="vg-chip-list" data-vg-chips="${v.id}">
        ${values.map(val => {
          const price = Number(prices[val] || 0);
          return `<span class="vg-chip">${escapeHtml(val)}${price > 0 ? ` <em>${fmtPrice(price, __currencySymbol)}</em>` : ''} <button type="button" data-vg-remove-value="${v.id}" data-value="${escapeHtml(val)}">&times;</button></span>`;
        }).join('')}
      </div>
    </div>
  `;
  }).join('');

  wrap.querySelectorAll('[data-vg-name]').forEach(input => {
    input.addEventListener('input', () => {
      const v = __currentVariations.find(x => x.id === input.getAttribute('data-vg-name'));
      if (v) v.group_name = input.value;
    });
  });
  wrap.querySelectorAll('[data-vg-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-vg-remove');
      const v = __currentVariations.find(x => x.id === id);
      if (v) {
        if (v._isNew) __currentVariations = __currentVariations.filter(x => x.id !== id);
        else { v._deleted = true; __deletedVariationIds.push(id); }
      }
      renderVariationGroups();
    });
  });

  wrap.querySelectorAll('[data-vg-price-toggle]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const v = __currentVariations.find(x => x.id === toggle.getAttribute('data-vg-price-toggle'));
      if (!v) return;
      v._priceEnabled = toggle.checked;
      if (!toggle.checked) v.variant_prices = {};
      renderVariationGroups();
    });
  });

  function addVariationValue(id) {
    const input = wrap.querySelector(`[data-vg-value-input="${id}"]`);
    const priceInput = wrap.querySelector(`[data-vg-price-input="${id}"]`);
    const val = input ? input.value.trim() : '';
    if (!val) return;
    const v = __currentVariations.find(x => x.id === id);
    if (v) {
      v.group_values = v.group_values || [];
      v.variant_prices = v.variant_prices && typeof v.variant_prices === 'object' ? v.variant_prices : {};
      if (!v.group_values.includes(val)) v.group_values.push(val);
      if (v._priceEnabled && priceInput && priceInput.value !== '') {
        const amount = Number(priceInput.value);
        if (amount > 0) v.variant_prices[val] = amount;
      }
    }
    if (input) input.value = '';
    if (priceInput) priceInput.value = '';
    renderVariationGroups();
  }

  wrap.querySelectorAll('[data-vg-value-input]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addVariationValue(input.getAttribute('data-vg-value-input'));
      }
    });
  });
  wrap.querySelectorAll('[data-vg-price-input]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addVariationValue(input.getAttribute('data-vg-price-input'));
      }
    });
  });
  wrap.querySelectorAll('[data-vg-add-value]').forEach(btn => {
    btn.addEventListener('click', () => addVariationValue(btn.getAttribute('data-vg-add-value')));
  });
  wrap.querySelectorAll('[data-vg-remove-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-vg-remove-value');
      const val = btn.getAttribute('data-value');
      const v = __currentVariations.find(x => x.id === id);
      if (v) {
        v.group_values = (v.group_values || []).filter(x => x !== val);
        if (v.variant_prices) delete v.variant_prices[val];
      }
      renderVariationGroups();
    });
  });
}

function addVariationGroup() {
  __currentVariations.push({
    id: genLocalId('vg'),
    group_name: '',
    group_values: [],
    variant_prices: {},
    _priceEnabled: false,
    sort_order: __currentVariations.length,
    _isNew: true
  });
  renderVariationGroups();
}

/* ---------------------------------------------------------------------- *
 *  Modal open/close
 * ---------------------------------------------------------------------- */

function openProductModal(id) {
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('depositGroup').style.display = 'none';
  document.getElementById('releaseDateGroup').style.display = 'none';

  __currentMedia = [];
  __deletedMediaIds = [];
  __currentVariations = [];
  __deletedVariationIds = [];

  if (id) {
    const p = __adminProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    form.id.value = p.id;
    form.name.value = p.name || '';
    form.description.value = p.description || '';
    form.price.value = p.price || 0;
    form.compare_at_price.value = p.compare_at_price || '';
    populateCategorySelect(p.category || '');
    form.sku.value = p.sku || '';
    form.product_type.value = p.product_type || 'in_stock';
    form.status.value = p.status || 'active';
    form.stock_quantity.value = p.stock_quantity || 0;
    form.deposit_percent.value = p.deposit_percent || 0;
    form.release_date.value = p.release_date || '';
    form.featured.checked = !!p.featured;

    // Load this product's media, falling back to its legacy image_url/gallery
    // fields if no product_media rows exist yet (pre-migration products).
    const existingMedia = (__allMediaCache || []).filter(m => m.product_id === id);
    if (existingMedia.length) {
      __currentMedia = existingMedia
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(m => ({ ...m, _isNew: false }));
    } else {
      const legacyUrls = [p.image_url, ...(Array.isArray(p.gallery) ? p.gallery : [])].filter(Boolean);
      __currentMedia = [...new Set(legacyUrls)].map((url, idx) => ({
        id: genLocalId('media'), media_type: 'image', url, is_chunked: false, sort_order: idx, _isNew: true
      }));
    }

    const existingVariations = (__allVariationsCache || []).filter(v => v.product_id === id);
    __currentVariations = existingVariations
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(v => ({
        ...v,
        group_values: Array.isArray(v.group_values) ? v.group_values : [],
        variant_prices: v.variant_prices && typeof v.variant_prices === 'object' ? v.variant_prices : {},
        _priceEnabled: !!(v.variant_prices && typeof v.variant_prices === 'object' && Object.keys(v.variant_prices).length),
        _isNew: false
      }));
  } else {
    document.getElementById('modalTitle').textContent = 'New Product';
    form.id.value = '';
    populateCategorySelect('');
    form.product_type.value = 'in_stock';
    form.status.value = 'active';
  }

  toggleTypeFields();
  renderMediaList();
  renderVariationGroups();
  document.getElementById('productModal').classList.add('show');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('show');
}

async function deleteProduct(id) {
  const p = __adminProducts.find(x => x.id === id);
  if (!confirm(`Delete "${p ? p.name : 'this product'}"? This cannot be undone.`)) return;
  try {
    await API.remove('products', id);
    const media = (__allMediaCache || []).filter(m => m.product_id === id);
    const variations = (__allVariationsCache || []).filter(v => v.product_id === id);
    for (const m of media) {
      try { await API.remove('product_media', m.id); } catch (e) {}
      if (m.is_chunked) await deleteVideoChunks(m.id);
    }
    for (const v of variations) { try { await API.remove('product_variations', v.id); } catch (e) {} }
    __adminProducts = __adminProducts.filter(x => x.id !== id);
    renderProductsTable();
    showAdminToast('Product deleted');
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to delete product', 'fa-triangle-exclamation');
  }
}

async function syncProductMedia(productId, onProgress) {
  for (const id of __deletedMediaIds) {
    try { await API.remove('product_media', id); } catch (e) {}
    await deleteVideoChunks(id);
  }
  const visible = __currentMedia.filter(m => !m._deleted);
  for (let i = 0; i < visible.length; i++) {
    const m = visible[i];

    if (m.media_type === 'video' && m._file) {
      // New video upload: create the media row first, then chunk-upload
      // its data URL into media_chunks linked by this row's id.
      const mediaId = m._isNew ? genLocalId('pm') : m.id;
      const rowPayload = { product_id: productId, media_type: 'video', url: '', is_chunked: true, sort_order: i };
      try {
        if (m._isNew) {
          await API.create('product_media', { id: mediaId, ...rowPayload });
        } else {
          await API.update('product_media', mediaId, rowPayload);
        }
        if (onProgress) onProgress(`Uploading video "${m._fileName}"...`);
        await saveVideoChunks(m._file, mediaId, (done, total) => {
          if (onProgress) onProgress(`Uploading video "${m._fileName}"... (${done}/${total})`);
        });
      } catch (e) { console.warn('video upload failed', e); }
      continue;
    }

    const payload = { product_id: productId, media_type: m.media_type, url: m.url || '', is_chunked: !!m.is_chunked, sort_order: i };
    try {
      if (m._isNew) {
        await API.create('product_media', { id: genLocalId('pm'), ...payload });
      } else {
        await API.update('product_media', m.id, payload);
      }
    } catch (e) { console.warn('media sync failed', e); }
  }
}

async function syncProductVariations(productId) {
  for (const id of __deletedVariationIds) {
    try { await API.remove('product_variations', id); } catch (e) {}
  }
  const visible = __currentVariations.filter(v => !v._deleted && (v.group_name || '').trim());
  for (let i = 0; i < visible.length; i++) {
    const v = visible[i];
    const payload = {
      product_id: productId,
      group_name: v.group_name.trim(),
      group_values: v.group_values || [],
      variant_prices: v._priceEnabled ? (v.variant_prices || {}) : {},
      sort_order: i
    };
    try {
      if (v._isNew) {
        await API.create('product_variations', { id: genLocalId('pv'), ...payload });
      } else {
        await API.update('product_variations', v.id, payload);
      }
    } catch (e) { console.warn('variation sync failed', e); }
  }
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const saveBtn = document.getElementById('saveProductBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const fd = new FormData(form);
  const id = fd.get('id');

  const visibleMedia = __currentMedia.filter(m => !m._deleted);
  const imageItems = visibleMedia.filter(m => m.media_type === 'image');
  if (!imageItems.length) {
    showAdminToast('Please add at least one product photo.', 'fa-triangle-exclamation');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Product';
    return;
  }

  const categoryVal = fd.get('category') === '__add_new__' ? '' : (fd.get('category') || '');

  const payload = {
    name: fd.get('name'),
    description: fd.get('description') || '',
    price: Number(fd.get('price')) || 0,
    compare_at_price: Number(fd.get('compare_at_price')) || 0,
    category: categoryVal,
    sku: fd.get('sku') || '',
    image_url: imageItems[0].url,
    gallery: imageItems.slice(1).map(m => m.url),
    product_type: fd.get('product_type'),
    status: fd.get('status'),
    stock_quantity: Number(fd.get('stock_quantity')) || 0,
    deposit_percent: Number(fd.get('deposit_percent')) || 0,
    release_date: fd.get('release_date') || '',
    featured: fd.get('featured') === 'on'
  };

  try {
    let productId = id;
    if (id) {
      await API.update('products', id, payload);
      const idx = __adminProducts.findIndex(x => x.id === id);
      if (idx > -1) __adminProducts[idx] = { ...__adminProducts[idx], ...payload };
    } else {
      productId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      payload.id = productId;
      const created = await API.create('products', payload);
      __adminProducts.unshift(created);
    }

    await syncProductMedia(productId, (msg) => {
      saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msg}`;
    });
    await syncProductVariations(productId);
    await loadAllMediaAndVariations();

    showAdminToast(id ? 'Product updated' : 'Product created');
    closeProductModal();
    renderProductsTable();
  } catch (err) {
    console.error(err);
    showAdminToast('Failed to save product: ' + (err.message || 'unknown error'), 'fa-triangle-exclamation');
  }
  saveBtn.disabled = false;
  saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Product';
}

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('products', 'Products');

  try {
    const settings = await API.get('settings', 'store_settings');
    __currencySymbol = settings.currency_symbol || '$';
  } catch (e) {}

  await loadCategories();

  try {
    __adminProducts = await API.listAll('products');
    await loadAllMediaAndVariations();
    renderProductsTable();
  } catch (e) {
    console.error(e);
    document.getElementById('productsBody').innerHTML = '<tr class="empty-row"><td colspan="7" style="color:var(--danger);">Failed to load products.</td></tr>';
  }

  document.getElementById('searchInput').addEventListener('input', renderProductsTable);
  document.getElementById('typeFilter').addEventListener('change', renderProductsTable);
  document.getElementById('statusFilter').addEventListener('change', renderProductsTable);
  document.getElementById('newProductBtn').addEventListener('click', () => openProductModal(null));
  document.getElementById('closeModalBtn').addEventListener('click', closeProductModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeProductModal);
  document.getElementById('productTypeSelect').addEventListener('change', toggleTypeFields);
  document.getElementById('productForm').addEventListener('submit', handleProductFormSubmit);
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProductModal();
  });

  document.getElementById('addMediaBtn').addEventListener('click', () => document.getElementById('mediaFileInput').click());
  document.getElementById('mediaFileInput').addEventListener('change', (e) => {
    handleMediaFilesSelected(e.target.files);
    e.target.value = '';
  });

  document.getElementById('addVariationGroupBtn').addEventListener('click', addVariationGroup);

  // Category select -> quick-add flow
  document.getElementById('categorySelect').addEventListener('change', (e) => {
    if (e.target.value === '__add_new__') openQuickAddCategoryModal();
  });
  document.getElementById('closeQuickCategoryBtn').addEventListener('click', closeQuickAddCategoryModal);
  document.getElementById('cancelQuickCategoryBtn').addEventListener('click', closeQuickAddCategoryModal);
  document.getElementById('quickCategoryForm').addEventListener('submit', handleQuickAddCategorySubmit);
  document.getElementById('quickAddCategoryModal').addEventListener('click', (e) => {
    if (e.target.id === 'quickAddCategoryModal') closeQuickAddCategoryModal();
  });
  wireIconPicker(document.getElementById('quickIconPickerBtn'), document.getElementById('quick_icon'), document.getElementById('quickIconPreview'));

  if (new URLSearchParams(window.location.search).get('new') === '1') {
    openProductModal(null);
  }
});
