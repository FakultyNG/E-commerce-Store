/* ==========================================================================
   Amah Wigs — Wishlist management (localStorage based)
   ========================================================================== */

const WISHLIST_KEY = 'femaura_wishlist_v1';

const Wishlist = {
  getIds() {
    try {
      return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  saveIds(ids) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    this.updateBadge();
  },

  has(id) {
    return this.getIds().includes(id);
  },

  toggle(id) {
    const ids = this.getIds();
    const idx = ids.indexOf(id);
    if (idx > -1) {
      ids.splice(idx, 1);
      this.saveIds(ids);
      return false;
    } else {
      ids.push(id);
      this.saveIds(ids);
      return true;
    }
  },

  remove(id) {
    const ids = this.getIds().filter(i => i !== id);
    this.saveIds(ids);
  },

  count() {
    return this.getIds().length;
  },

  updateBadge() {
    document.querySelectorAll('.wishlist-count').forEach(el => {
      const c = this.count();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });
  }
};

function toggleWishlistBtn(btnEl, productId) {
  const isNowActive = Wishlist.toggle(productId);
  document.querySelectorAll(`[data-wish-id="${productId}"]`).forEach(el => {
    el.classList.toggle('active', isNowActive);
  });
  if (typeof showToast === 'function') {
    showToast(isNowActive ? 'Added to wishlist' : 'Removed from wishlist', isNowActive ? 'fa-heart' : 'fa-circle-check');
  }
}

document.addEventListener('DOMContentLoaded', () => Wishlist.updateBadge());
