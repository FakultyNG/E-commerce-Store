/* ==========================================================================
   Nexova Store — Cart management (localStorage based)
   ========================================================================== */

const CART_KEY = 'nexova_cart_v1';

const Cart = {
  getItems() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(product, qty = 1, variation = null) {
    const items = this.getItems();
    // Treat items with different selected variations as separate cart lines
    // (e.g. same product in Red vs Blue), keyed by product id + variation combo.
    const variationKey = variation ? JSON.stringify(variation) : '';
    const existing = items.find(i => i.id === product.id && (i._variationKey || '') === variationKey);
    const maxQty = Math.max(0, product.stock_quantity || 0);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, maxQty || existing.qty + qty);
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        product_type: product.product_type,
        deposit_percent: product.deposit_percent || 0,
        release_date: product.release_date || '',
        stock_quantity: product.stock_quantity,
        variation: variation || null,
        _variationKey: variationKey,
        qty: Math.min(qty, maxQty || qty)
      });
    }
    this.saveItems(items);
  },

  updateQtyAt(index, qty) {
    const items = this.getItems();
    if (items[index]) {
      items[index].qty = Math.max(1, qty);
      this.saveItems(items);
    }
  },

  removeAt(index) {
    const items = this.getItems();
    items.splice(index, 1);
    this.saveItems(items);
  },

  // Legacy id-based helpers (kept for backward compatibility; act on the
  // first matching line item only — prefer updateQtyAt/removeAt when a
  // product may have multiple cart lines due to different variations).
  updateQty(id, qty) {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      item.qty = Math.max(1, qty);
      this.saveItems(items);
    }
  },

  remove(id) {
    const items = this.getItems().filter(i => i.id !== id);
    this.saveItems(items);
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    this.updateBadge();
  },

  count() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  // Total due now: full price for in-stock items, deposit % for pre-order items
  dueNow() {
    return this.getItems().reduce((sum, i) => {
      if (i.product_type === 'pre_order' && i.deposit_percent > 0) {
        return sum + (i.price * i.qty * i.deposit_percent / 100);
      }
      return sum + i.price * i.qty;
    }, 0);
  },

  hasPreorder() {
    return this.getItems().some(i => i.product_type === 'pre_order');
  },
  hasInStock() {
    return this.getItems().some(i => i.product_type !== 'pre_order');
  },

  orderType() {
    const hasPre = this.hasPreorder();
    const hasStock = this.hasInStock();
    if (hasPre && hasStock) return 'mixed';
    if (hasPre) return 'pre_order';
    return 'in_stock';
  },

  updateBadge() {
    document.querySelectorAll('.cart-count').forEach(el => {
      const c = this.count();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    });
  }
};

document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());
