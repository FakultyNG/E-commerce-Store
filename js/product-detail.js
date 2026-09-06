/* ==========================================================================
   Amah Wigs — Product detail page logic
   Supports a multi-photo/video gallery (from product_media) and
   color/size-style variation groups (from product_variations).
   ========================================================================== */

let __pdpMedia = [];
let __pdpSelectedVariations = {};

function renderPdpGallery(media, name) {
  if (!media.length) {
    return {
      mainHtml: `<img src="images/logo.png" alt="${escapeHtml(name)}" id="pdpMainImg">`,
      thumbsHtml: ''
    };
  }

  const first = media[0];
  const mainHtml = first.media_type === 'video'
    ? `<video id="pdpMainImg" ${first.url ? `src="${first.url}"` : ''} data-media-id="${first.id || ''}" data-chunked="${first.is_chunked ? '1' : ''}" controls playsinline></video>`
    : `<img id="pdpMainImg" src="${first.url}" alt="${escapeHtml(name)}" loading="eager" onerror="this.onerror=null;this.src='images/logo.png';">`;

  const thumbsHtml = media.length > 1 ? `
    <div class="pdp-thumbs" id="pdpThumbs">
      ${media.map((m, idx) => `
        <div class="pdp-thumb ${idx === 0 ? 'active' : ''}" data-thumb-idx="${idx}">
          ${m.media_type === 'video'
            ? `<video ${m.url ? `src="${m.url}"` : ''} data-media-id="${m.id || ''}" data-chunked="${m.is_chunked ? '1' : ''}" muted></video><span class="thumb-play-icon"><i class="fa-solid fa-play"></i></span>`
            : `<img src="${m.url}" alt="" loading="lazy" onerror="this.onerror=null;this.src='images/logo.png';">`}
        </div>`).join('')}
    </div>` : '';

  return { mainHtml, thumbsHtml };
}

async function loadChunkedVideoSrcs(root) {
  const videos = root.querySelectorAll('video[data-chunked="1"]');
  for (const v of videos) {
    const mediaId = v.getAttribute('data-media-id');
    if (!mediaId || v.src) continue;
    try {
      const blobUrl = await loadVideoBlobUrl(mediaId);
      if (blobUrl) v.src = blobUrl;
    } catch (e) { console.warn('Failed to load chunked video', e); }
  }
}

function wirePdpGalleryThumbs(media) {
  document.querySelectorAll('#pdpThumbs .pdp-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = Number(thumb.getAttribute('data-thumb-idx'));
      const m = media[idx];
      const mainWrap = document.querySelector('.pdp-main-img');
      mainWrap.innerHTML = m.media_type === 'video'
        ? `<video id="pdpMainImg" ${m.url ? `src="${m.url}"` : ''} data-media-id="${m.id || ''}" data-chunked="${m.is_chunked ? '1' : ''}" controls playsinline autoplay></video>`
        : `<img id="pdpMainImg" src="${m.url}" alt="" onerror="this.onerror=null;this.src='images/logo.png';">`;
      document.querySelectorAll('#pdpThumbs .pdp-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      loadChunkedVideoSrcs(mainWrap);
    });
  });
}

function renderPdpVariations(variations) {
  if (!variations.length) return '';
  __pdpSelectedVariations = {};
  return variations.map(v => {
    const values = Array.isArray(v.group_values) ? v.group_values : [];
    if (!values.length) return '';
    __pdpSelectedVariations[v.group_name] = values[0];
    return `
    <div class="pdp-variation-group" data-group="${escapeHtml(v.group_name)}">
      <label>${escapeHtml(v.group_name)}: <span class="selected-value-label">${escapeHtml(values[0])}</span></label>
      <div class="pdp-variation-options">
        ${values.map((val, idx) => `<button type="button" class="pdp-variation-chip ${idx === 0 ? 'selected' : ''}" data-group="${escapeHtml(v.group_name)}" data-value="${escapeHtml(val)}">${escapeHtml(val)}</button>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function wirePdpVariationChips() {
  document.querySelectorAll('.pdp-variation-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.getAttribute('data-group');
      const value = chip.getAttribute('data-value');
      __pdpSelectedVariations[group] = value;
      const container = chip.closest('.pdp-variation-group');
      container.querySelectorAll('.pdp-variation-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      container.querySelector('.selected-value-label').textContent = value;
    });
  });
}

function renderPdp(p, symbol, media, variations) {
  const isPreorder = p.product_type === 'pre_order';
  const outOfStock = !isPreorder && (p.stock_quantity || 0) <= 0;
  const onSale = p.compare_at_price && p.compare_at_price > p.price;
  const depositAmt = isPreorder && p.deposit_percent > 0 ? (p.price * p.deposit_percent / 100) : p.price;

  document.getElementById('crumbName').textContent = p.name;
  document.title = `${p.name} — Amah Wigs`;

  let stockLine = '';
  if (isPreorder) {
    stockLine = `<div class="stock-line"><span class="stock-dot" style="background:var(--accent);"></span> Pre-Order &mdash; ${p.release_date ? 'expected ' + p.release_date : 'release date TBA'}</div>`;
  } else if (outOfStock) {
    stockLine = `<div class="stock-line"><span class="stock-dot" style="background:var(--danger);"></span> Out of stock</div>`;
  } else if (p.stock_quantity <= 5) {
    stockLine = `<div class="stock-line"><span class="stock-dot" style="background:var(--danger);"></span> Only ${p.stock_quantity} left in stock &mdash; order soon</div>`;
  } else {
    stockLine = `<div class="stock-line"><span class="stock-dot" style="background:var(--success);"></span> In stock &mdash; ${p.stock_quantity} available, ships in 1-2 days</div>`;
  }

  let preorderPanel = '';
  if (isPreorder) {
    preorderPanel = `
      <div class="pdp-panel preorder">
        <h4><i class="fa-solid fa-hourglass-half"></i> Pre-Order Details</h4>
        <p>
          ${p.deposit_percent > 0
            ? `Pay a <strong>${p.deposit_percent}% deposit</strong> (${fmtPrice(depositAmt, symbol)}) today to reserve. The remaining balance is due before shipment.`
            : `Full payment is charged now. Item ships as soon as it's released.`}
          ${p.release_date ? `<br>Expected availability: <strong>${escapeHtml(p.release_date)}</strong>.` : ''}
        </p>
      </div>`;
  }

  const maxQty = isPreorder ? 99 : Math.max(1, p.stock_quantity || 1);
  const isWished = typeof Wishlist !== 'undefined' && Wishlist.has(p.id);

  const gallery = renderPdpGallery(media, p.name);
  const variationsHtml = renderPdpVariations(variations);

  document.getElementById('pdpContent').innerHTML = `
    <div class="pdp-grid">
      <div class="pdp-gallery">
        <div class="pdp-main-img">${gallery.mainHtml}</div>
        ${gallery.thumbsHtml}
      </div>
      <div class="pdp-details">
        ${isPreorder ? '<span class="badge badge-preorder" style="position:static;display:inline-block;margin-bottom:10px;">Pre-Order</span>' : '<span class="badge badge-instock" style="position:static;display:inline-block;margin-bottom:10px;">In Stock</span>'}
        <h1 class="pdp-title">${escapeHtml(p.name)}</h1>
        <div class="pdp-sku">SKU: ${escapeHtml(p.sku || '—')} &nbsp;|&nbsp; Category: ${escapeHtml(p.category || '—')}</div>
        <div class="pdp-price-row">
          <span class="pdp-price">${fmtPrice(p.price, symbol)}</span>
          ${onSale ? `<span class="price-compare" style="font-size:18px;">${fmtPrice(p.compare_at_price, symbol)}</span>` : ''}
        </div>
        ${stockLine}
        ${preorderPanel}
        ${variationsHtml}
        <div style="margin-top:22px;">
          <label style="font-size:13.5px;font-weight:600;display:block;margin-bottom:8px;">Quantity</label>
          <div class="qty-selector">
            <button type="button" id="qtyMinus">−</button>
            <input type="number" id="qtyInput" value="1" min="1" max="${maxQty}">
            <button type="button" id="qtyPlus">+</button>
          </div>
        </div>
        <div class="pdp-buy-row">
          <button class="btn ${isPreorder ? 'btn-accent' : 'btn-primary'} btn-block" id="addToCartBtn" ${outOfStock ? 'disabled' : ''}>
            <i class="fa-solid ${isPreorder ? 'fa-clock' : 'fa-cart-plus'}"></i>
            ${outOfStock ? 'Out of Stock' : isPreorder ? 'Reserve Now' : 'Add to Cart'}
          </button>
          <button class="pdp-wish-btn ${isWished ? 'active' : ''}" data-wish-id="${p.id}" aria-label="Toggle wishlist" onclick="toggleWishlistBtn(this, '${p.id}');">
            <i class="fa-solid fa-heart"></i>
          </button>
        </div>
        <div class="pdp-desc">
          <h3>Product Description</h3>
          <p>${escapeHtml(p.description || 'No description available.')}</p>
        </div>
      </div>
    </div>
  `;

  wirePdpGalleryThumbs(media);
  wirePdpVariationChips();
  loadChunkedVideoSrcs(document.querySelector('.pdp-gallery'));

  document.getElementById('qtyMinus').addEventListener('click', () => {
    const input = document.getElementById('qtyInput');
    input.value = Math.max(1, Number(input.value) - 1);
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    const input = document.getElementById('qtyInput');
    input.value = Math.min(maxQty, Number(input.value) + 1);
  });
  const addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const qty = Math.max(1, Number(document.getElementById('qtyInput').value) || 1);
      Cart.add(p, qty, variations.length ? { ...__pdpSelectedVariations } : null);
      showToast(`${p.name} added to cart`);
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('');
  const settings = await getSettings();
  window.__currencySymbol = settings.currency_symbol || '$';

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    document.getElementById('pdpContent').innerHTML = '<div class="empty-state"><h3>Product not found</h3><p>No product ID specified.</p><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>';
    return;
  }

  try {
    const p = await API.get('products', id);

    // Load media (falls back to legacy image_url/gallery if none exist yet)
    let media = [];
    try {
      const allMedia = await API.listAll('product_media');
      media = allMedia.filter(m => m.product_id === id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch (e) { media = []; }
    if (!media.length) {
      const legacyUrls = [p.image_url, ...(Array.isArray(p.gallery) ? p.gallery : [])].filter(Boolean);
      media = [...new Set(legacyUrls)].map(url => ({ media_type: 'image', url }));
    }

    let variations = [];
    try {
      const allVariations = await API.listAll('product_variations');
      variations = allVariations.filter(v => v.product_id === id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch (e) { variations = []; }

    renderPdp(p, window.__currencySymbol, media, variations);

    // Related products by category
    const all = await API.listAll('products');
    const related = all.filter(x => x.id !== p.id && x.category === p.category && x.status !== 'inactive').slice(0, 4);
    const fallback = related.length ? related : all.filter(x => x.id !== p.id && x.status !== 'inactive').slice(0, 4);
    document.getElementById('relatedGrid').innerHTML = fallback.map(x => productCardHtml(x, window.__currencySymbol)).join('') || '<p style="color:var(--gray-500);">No related products.</p>';
  } catch (e) {
    console.error(e);
    document.getElementById('pdpContent').innerHTML = '<div class="empty-state"><h3>Product not found</h3><p>This product may have been removed.</p><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>';
  }
});
