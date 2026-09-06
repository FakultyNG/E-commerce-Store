/* ==========================================================================
   Amah Wigs — Shared header/footer/bottom-nav injection for storefront pages
   ========================================================================== */

function renderHeader(activePage) {
  const nav = [
    { href: 'index.html', label: 'Home', key: 'home' },
    { href: 'shop.html', label: 'Shop', key: 'shop' },
    { href: 'shop.html?type=pre_order', label: 'Pre-Orders', key: 'preorder' },
    { href: 'wishlist.html', label: 'Wishlist', key: 'wishlist' },
    { href: 'track-order.html', label: 'Track Order', key: 'track' },
  ];
  const navHtml = nav.map(n => `<a href="${n.href}" class="${activePage === n.key ? 'active' : ''}">${n.label}</a>`).join('');

  return `
  <div class="announce-bar">🚀 Free shipping on orders over $75 &nbsp;|&nbsp; Reserve pre-order items with a small deposit</div>
  <header class="site-header">
    <!-- (announcement bar text above is overwritten by applySiteContentToDom() once site_content loads) -->
    <!-- Desktop row -->
    <div class="header-inner">
      <a href="index.html" class="logo">Amah Wigs</a>
      <nav class="main-nav">${navHtml}</nav>
      <form class="search-box" onsubmit="event.preventDefault(); window.location.href='shop.html?q=' + encodeURIComponent(this.q.value);">
        <i class="fa-solid fa-magnifying-glass" style="color:#9ca3af;font-size:13px;"></i>
        <input type="text" name="q" placeholder="Search products...">
      </form>
      <div class="header-actions">
        <a href="wishlist.html" class="icon-btn" aria-label="Wishlist">
          <i class="fa-solid fa-heart"></i>
          <span class="cart-badge wishlist-count" style="display:none;">0</span>
        </a>
        <a href="cart.html" class="icon-btn" aria-label="Cart">
          <i class="fa-solid fa-cart-shopping"></i>
          <span class="cart-badge cart-count" style="display:none;">0</span>
        </a>
        <a href="admin/login.html" class="icon-btn" aria-label="Admin"><i class="fa-solid fa-user-gear"></i></a>
      </div>
    </div>

    <!-- Mobile top bar: hamburger — centered logo — cart -->
    <div class="header-top-mobile">
      <button class="hamburger-btn" id="mobileMenuBtn" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
      <a href="index.html" class="logo-mobile"><span class="logo-mobile-text">Amah Wigs</span></a>
      <a href="cart.html" class="cart-icon-mobile" aria-label="Cart">
        <i class="fa-solid fa-cart-shopping"></i>
        <span class="cart-badge cart-count" style="display:none;">0</span>
      </a>
    </div>

    <!-- Mobile search row -->
    <div class="search-row-mobile">
      <form class="search-box" onsubmit="event.preventDefault(); window.location.href='shop.html?q=' + encodeURIComponent(this.q.value);">
        <i class="fa-solid fa-magnifying-glass" style="color:#9ca3af;font-size:13px;"></i>
        <input type="text" name="q" placeholder="Search for products...">
      </form>
    </div>

    <!-- Mobile dropdown nav -->
    <nav class="mobile-dropdown-nav" id="mobileNav">
      ${navHtml}
      <a href="admin/login.html"><i class="fa-solid fa-user-gear"></i> Admin Dashboard</a>
    </nav>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="footer-grid">
      <div>
        <h4>Amah Wigs</h4>
        <p id="footerAboutText" style="font-size:14px;color:#9ca3af;max-width:280px;">Women's lifestyle & casual activewear — available now, or reserved ahead with pre-orders on upcoming releases.</p>
        <ul id="footerContactInfo" style="margin-top:12px;"></ul>
        <div id="footerSocialLinks" style="display:none;font-size:18px;margin-top:12px;"></div>
      </div>
      <div>
        <h4>Shop</h4>
        <ul>
          <li><a href="shop.html">All Products</a></li>
          <li><a href="shop.html?type=in_stock">In Stock</a></li>
          <li><a href="shop.html?type=pre_order">Pre-Orders</a></li>
        </ul>
      </div>
      <div>
        <h4>Support</h4>
        <ul>
          <li><a href="track-order.html">Track Order</a></li>
          <li><a href="cart.html">Your Cart</a></li>
          <li><a href="wishlist.html">Your Wishlist</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="admin/login.html">Admin Dashboard</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">© 2026 Amah Wigs. All rights reserved.</div>
  </footer>`;
}

function renderBottomNav(activePage) {
  const items = [
    { href: 'index.html', label: 'Home', icon: 'fa-house', key: 'home' },
    { href: 'shop.html', label: 'Categories', icon: 'fa-grip', key: 'shop' },
    { href: 'wishlist.html', label: 'Wishlist', icon: 'fa-heart', key: 'wishlist', badge: 'wishlist-count' },
    { href: 'account.html', label: 'Account', icon: 'fa-user', key: 'account' },
  ];
  const itemsHtml = items.map(it => `
    <a href="${it.href}" class="bottom-nav-item ${activePage === it.key ? 'active' : ''}">
      <i class="fa-solid ${it.icon}"></i>
      <span>${it.label}</span>
      ${it.badge ? `<span class="bn-badge ${it.badge}" style="display:none;">0</span>` : ''}
    </a>`).join('');

  return `
  <nav class="bottom-nav">
    <div class="bottom-nav-inner">${itemsHtml}</div>
  </nav>`;
}

function renderWhatsAppButton() {
  const phone = '2348166292037';
  const message = encodeURIComponent("Hi! I have a question about a product on Amah Wigs.");
  return `<a href="https://wa.me/${phone}?text=${message}" class="whatsapp-float-btn" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>`;
}

function initLayout(activePage) {
  document.getElementById('header-slot').innerHTML = renderHeader(activePage);
  document.getElementById('footer-slot').innerHTML = renderFooter();
  const bottomNavSlot = document.getElementById('bottom-nav-slot');
  if (bottomNavSlot) bottomNavSlot.innerHTML = renderBottomNav(activePage);

  if (!document.getElementById('whatsappFloatBtn')) {
    document.body.insertAdjacentHTML('beforeend', renderWhatsAppButton().replace('class="whatsapp-float-btn"', 'id="whatsappFloatBtn" class="whatsapp-float-btn"'));
  }

  Cart.updateBadge();
  if (typeof Wishlist !== 'undefined') Wishlist.updateBadge();

  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('mobileNav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }

  // Apply theme colors + announcement/footer content on every page that
  // includes site-content.js (all storefront pages).
  if (typeof getSiteContent === 'function') {
    getSiteContent().then(content => applySiteContentToDom(content));
  }
}

function showToast(message, icon = 'fa-circle-check') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
