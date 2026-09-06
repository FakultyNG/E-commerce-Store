/* ==========================================================================
   Amah Wigs — Cart page logic
   ========================================================================== */

function formatVariation(variation) {
  if (!variation) return '';
  return Object.entries(variation).map(([k, v]) => `${k}: ${v}`).join(', ');
}

function renderCartPage(symbol) {
  const items = Cart.getItems();
  const container = document.getElementById('cartContent');

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-cart-shopping"></i>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added anything yet.</p>
        <a href="shop.html" class="btn btn-primary">Start Shopping</a>
      </div>`;
    return;
  }

  const subtotal = Cart.subtotal();
  const dueNow = Cart.dueNow();
  const laterDue = subtotal - dueNow;
  const hasPreorder = Cart.hasPreorder();

  const itemsHtml = items.map((i, idx) => {
    const isPreorder = i.product_type === 'pre_order';
    const lineTotal = i.price * i.qty;
    const variationText = formatVariation(i.variation);
    return `
    <div class="cart-item" data-idx="${idx}">
      <a href="product.html?id=${i.id}"><img src="${i.image_url}" alt="${escapeHtml(i.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/logo.png';"></a>
      <div>
        <div class="cart-item-name"><a href="product.html?id=${i.id}">${escapeHtml(i.name)}</a></div>
        ${variationText ? `<div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${escapeHtml(variationText)}</div>` : ''}
        <div class="cart-item-type" style="color:${isPreorder ? 'var(--accent-dark)' : 'var(--success)'};">
          <i class="fa-solid ${isPreorder ? 'fa-clock' : 'fa-check'}"></i> ${isPreorder ? `Pre-Order${i.release_date ? ' · ships ' + i.release_date : ''}` : 'In Stock'}
        </div>
        <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">${fmtPrice(i.price, symbol)} each</div>
        <a href="#" class="cart-item-remove" data-remove-idx="${idx}"><i class="fa-solid fa-trash"></i> Remove</a>
      </div>
      <div class="qty-selector" style="height:40px;">
        <button type="button" data-minus-idx="${idx}" style="height:38px;width:34px;">−</button>
        <input type="number" value="${i.qty}" min="1" data-qty-idx="${idx}" style="height:38px;width:40px;">
        <button type="button" data-plus-idx="${idx}" style="height:38px;width:34px;">+</button>
      </div>
      <div style="font-weight:800;font-size:16px;min-width:80px;text-align:right;">${fmtPrice(lineTotal, symbol)}</div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items-list">
        ${itemsHtml}
      </div>
      <div class="cart-summary">
        <h3 style="margin:0 0 18px;font-size:17px;">Order Summary</h3>
        <div class="summary-row"><span>Subtotal</span><span>${fmtPrice(subtotal, symbol)}</span></div>
        ${hasPreorder ? `
        <div class="summary-row"><span>Due now (deposit${Cart.hasInStock() ? ' + in-stock items' : ''})</span><span>${fmtPrice(dueNow, symbol)}</span></div>
        <div class="summary-row"><span>Balance due before shipment</span><span>${fmtPrice(laterDue, symbol)}</span></div>
        ` : ''}
        <div class="summary-row total"><span>Total ${hasPreorder ? 'due now' : ''}</span><span>${fmtPrice(dueNow, symbol)}</span></div>
        ${hasPreorder ? `<p style="font-size:12.5px;color:var(--gray-500);margin:-6px 0 16px;">Pre-order items require a deposit today; the remaining balance is charged before shipment.</p>` : ''}
        <a href="checkout.html" class="btn btn-primary btn-block">Proceed to Checkout <i class="fa-solid fa-arrow-right"></i></a>
        <a href="shop.html" class="btn btn-outline btn-block" style="margin-top:10px;">Continue Shopping</a>
      </div>
    </div>`;

  // Wire events (index-based so items with the same product id but
  // different variations are handled independently)
  container.querySelectorAll('[data-remove-idx]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      Cart.removeAt(Number(el.getAttribute('data-remove-idx')));
      renderCartPage(symbol);
      showToast('Item removed from cart');
    });
  });
  container.querySelectorAll('[data-minus-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = Number(el.getAttribute('data-minus-idx'));
      const item = Cart.getItems()[idx];
      if (item) { Cart.updateQtyAt(idx, Math.max(1, item.qty - 1)); renderCartPage(symbol); }
    });
  });
  container.querySelectorAll('[data-plus-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = Number(el.getAttribute('data-plus-idx'));
      const item = Cart.getItems()[idx];
      if (item) { Cart.updateQtyAt(idx, item.qty + 1); renderCartPage(symbol); }
    });
  });
  container.querySelectorAll('[data-qty-idx]').forEach(el => {
    el.addEventListener('change', () => {
      const idx = Number(el.getAttribute('data-qty-idx'));
      Cart.updateQtyAt(idx, Math.max(1, Number(el.value) || 1));
      renderCartPage(symbol);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('');
  const settings = await getSettings();
  window.__currencySymbol = settings.currency_symbol || '$';
  renderCartPage(window.__currencySymbol);
});
