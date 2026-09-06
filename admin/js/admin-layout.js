/* ==========================================================================
   Nexova Store — Admin shared sidebar/topbar layout
   ========================================================================== */

function renderAdminSidebar(active) {
  const items = [
    { key: 'dashboard', href: 'index.html', icon: 'fa-gauge-high', label: 'Dashboard' },
    { key: 'products', href: 'products.html', icon: 'fa-box', label: 'Products' },
    { key: 'categories', href: 'categories.html', icon: 'fa-layer-group', label: 'Categories' },
    { key: 'orders', href: 'orders.html', icon: 'fa-receipt', label: 'Orders' },
    { key: 'coupons', href: 'coupons.html', icon: 'fa-tags', label: 'Coupons' },
    { key: 'content', href: 'content.html', icon: 'fa-palette', label: 'Theme & Content' },
    { key: 'settings', href: 'settings.html', icon: 'fa-gear', label: 'Settings' },
  ];
  const navHtml = items.map(i => `
    <a href="${i.href}" class="${active === i.key ? 'active' : ''}"><i class="fa-solid ${i.icon}"></i> ${i.label}</a>
  `).join('');

  return `
    <div class="admin-logo">
      <a href="index.html" class="admin-logo-text">WigsbyAmah</a>
      <button type="button" class="admin-sidebar-close" id="sidebarCloseBtn" aria-label="Close menu"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <nav class="admin-nav">${navHtml}</nav>
    <div class="admin-sidebar-footer">
      <a href="../index.html" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> View Store</a>
      <a href="#" onclick="adminLogout(); return false;"><i class="fa-solid fa-right-from-bracket"></i> Log Out</a>
    </div>
  `;
}

function initAdminLayout(active, pageTitle) {
  requireAdminAuth();
  const sidebar = document.getElementById('adminSidebar');
  sidebar.innerHTML = renderAdminSidebar(active);
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = pageTitle;

  // Backdrop overlay for the mobile hamburger menu (created once, shared across pages)
  let overlay = document.getElementById('adminSidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'adminSidebarOverlay';
    overlay.className = 'admin-sidebar-overlay';
    document.body.appendChild(overlay);
  }

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  const menuBtn = document.getElementById('sidebarToggle');
  if (menuBtn) {
    menuBtn.addEventListener('click', openSidebar);
  }
  overlay.addEventListener('click', closeSidebar);
  const closeBtn = document.getElementById('sidebarCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  // Close the menu automatically after tapping a nav link (mobile UX)
  sidebar.querySelectorAll('.admin-nav a, .admin-sidebar-footer a').forEach(a => {
    a.addEventListener('click', closeSidebar);
  });

  // Keep menu state sane if the viewport is resized back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeSidebar();
  });
}

function showAdminToast(message, icon = 'fa-circle-check') {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
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
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtPrice(amount, symbol = '$') {
  return `${symbol}${Number(amount || 0).toFixed(2)}`;
}
