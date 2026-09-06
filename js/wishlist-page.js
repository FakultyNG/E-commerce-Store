/* ==========================================================================
   Amah Wigs — Wishlist page logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('wishlist');
  const settings = await getSettings();
  window.__currencySymbol = settings.currency_symbol || '$';

  const container = document.getElementById('wishlistContent');
  const ids = Wishlist.getIds();

  if (!ids.length) {
    container.className = '';
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-heart"></i>
        <h3>Your wishlist is empty</h3>
        <p>Tap the heart icon on any product to save it here.</p>
        <a href="shop.html" class="btn btn-primary">Start Shopping</a>
      </div>`;
    return;
  }

  try {
    const all = await API.listAll('products');
    const items = all.filter(p => ids.includes(p.id));
    if (!items.length) {
      container.className = '';
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-heart"></i>
          <h3>Your wishlist is empty</h3>
          <p>Tap the heart icon on any product to save it here.</p>
          <a href="shop.html" class="btn btn-primary">Start Shopping</a>
        </div>`;
      return;
    }
    container.className = 'product-grid';
    container.innerHTML = items.map(p => productCardHtml(p, window.__currencySymbol)).join('');
  } catch (e) {
    console.error(e);
    container.className = '';
    container.innerHTML = '<p style="color:var(--danger);">Could not load your wishlist.</p>';
  }
});
