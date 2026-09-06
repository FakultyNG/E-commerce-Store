/* ==========================================================================
   WigsbyAmah — Product card rendering helper
   ========================================================================== */

function productCardHtml(p, symbol) {
  const isPreorder = p.product_type === 'pre_order';
  const outOfStock = !isPreorder && (p.stock_quantity || 0) <= 0;
  const lowStock = !isPreorder && p.stock_quantity > 0 && p.stock_quantity <= 5;
  const onSale = p.compare_at_price && p.compare_at_price > p.price;
  const isWished = typeof Wishlist !== 'undefined' && Wishlist.has(p.id);

  let typeBadge = isPreorder
    ? `<span class="badge badge-preorder"><i class="fa-solid fa-clock"></i> Pre-Order</span>`
    : `<span class="badge badge-instock"><i class="fa-solid fa-check"></i> In Stock</span>`;

  let saleBadge = onSale ? `<span class="badge badge-sale">Sale</span>` : '';

  let metaLine = isPreorder
    ? (p.release_date ? `Ships ${p.release_date}` : 'Ships when released')
    : (outOfStock ? `<span style="color:#dc2626;font-weight:700;">Out of stock</span>` : lowStock ? `<span style="color:#dc2626;font-weight:700;">Only ${p.stock_quantity} left</span>` : `${p.stock_quantity} in stock`);

  let actionBtn = outOfStock
    ? `<button class="btn btn-outline btn-block btn-sm" disabled>Out of Stock</button>`
    : `<button class="btn ${isPreorder ? 'btn-accent' : 'btn-primary'} btn-block btn-sm" onclick="quickAdd('${p.id}', event)"><i class="fa-solid fa-cart-plus"></i> ${isPreorder ? 'Reserve Now' : 'Add to Cart'}</button>`;

  return `
  <div class="product-card">
    <a href="product.html?id=${p.id}" class="product-thumb">
      ${typeBadge}${saleBadge}
      <img src="${p.image_url}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='images/logo.png';">
    </a>
    <button class="wish-btn ${isWished ? 'active' : ''}" data-wish-id="${p.id}" aria-label="Toggle wishlist" onclick="event.preventDefault(); toggleWishlistBtn(this, '${p.id}');">
      <i class="fa-solid fa-heart"></i>
    </button>
    <div class="product-info">
      <div class="product-cat">${escapeHtml(p.category || '')}</div>
      <h3 class="product-name"><a href="product.html?id=${p.id}">${escapeHtml(p.name)}</a></h3>
      <div class="product-price-row">
        <span class="price">${fmtPrice(p.price, symbol)}</span>
        ${onSale ? `<span class="price-compare">${fmtPrice(p.compare_at_price, symbol)}</span>` : ''}
      </div>
      <div class="product-meta">${metaLine}</div>
      <div class="product-actions">${actionBtn}</div>
    </div>
  </div>`;
}

async function quickAdd(productId, evt) {
  if (evt) evt.preventDefault();
  try {
    const p = await API.get('products', productId);
    Cart.add(p, 1);
    showToast(`${p.name} added to cart`);
  } catch (e) {
    showToast('Could not add product', 'fa-triangle-exclamation');
  }
}
