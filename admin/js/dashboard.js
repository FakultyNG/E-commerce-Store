/* ==========================================================================
   Nexova Store — Admin Dashboard logic
   ========================================================================== */

function paymentPill(status) {
  const map = {
    paid: 'pill-green', deposit_paid: 'pill-indigo', pending: 'pill-gray', balance_due: 'pill-amber'
  };
  return `<span class="pill ${map[status] || 'pill-gray'}">${(status || '').replace('_', ' ')}</span>`;
}
function fulfillmentPill(status) {
  const map = {
    pending: 'pill-gray', processing: 'pill-indigo', awaiting_stock: 'pill-amber', shipped: 'pill-indigo', delivered: 'pill-green', cancelled: 'pill-red'
  };
  return `<span class="pill ${map[status] || 'pill-gray'}">${(status || '').replace('_', ' ')}</span>`;
}
function typePill(type) {
  const map = { in_stock: 'pill-green', pre_order: 'pill-amber', mixed: 'pill-indigo' };
  const label = { in_stock: 'In Stock', pre_order: 'Pre-Order', mixed: 'Mixed' };
  return `<span class="pill ${map[type] || 'pill-gray'}">${label[type] || type}</span>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('dashboard', 'Dashboard');

  let symbol = '$';
  try {
    const settings = await API.get('settings', 'store_settings');
    symbol = settings.currency_symbol || '$';
  } catch (e) {}

  let products = [];
  let orders = [];
  try {
    [products, orders] = await Promise.all([API.listAll('products'), API.listAll('orders')]);
  } catch (e) {
    console.error(e);
    document.getElementById('statGrid').innerHTML = '<p style="color:var(--danger);">Failed to load data.</p>';
    return;
  }

  // ---- Stats ----
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => ['pending', 'processing', 'awaiting_stock'].includes(o.fulfillment_status)).length;
  const activeProducts = products.filter(p => p.status !== 'inactive').length;
  const preorderCount = orders.filter(o => o.order_type === 'pre_order' || o.order_type === 'mixed').length;
  const lowStockItems = products.filter(p => p.product_type !== 'pre_order' && p.stock_quantity > 0 && p.stock_quantity <= 5);
  const outOfStockItems = products.filter(p => p.product_type !== 'pre_order' && p.stock_quantity <= 0);

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:var(--primary-light);color:var(--primary);"><i class="fa-solid fa-sack-dollar"></i></div>
      </div>
      <p class="stat-value">${fmtPrice(totalRevenue, symbol)}</p>
      <p class="stat-label">Total Revenue Collected</p>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:var(--success-light);color:var(--success);"><i class="fa-solid fa-receipt"></i></div>
      </div>
      <p class="stat-value">${totalOrders}</p>
      <p class="stat-label">Total Orders (${pendingOrders} pending)</p>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:var(--warn-light);color:var(--warn);"><i class="fa-solid fa-clock"></i></div>
      </div>
      <p class="stat-value">${preorderCount}</p>
      <p class="stat-label">Pre-Order Involved Orders</p>
    </div>
    <div class="stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:var(--danger-light);color:var(--danger);"><i class="fa-solid fa-box-open"></i></div>
      </div>
      <p class="stat-value">${lowStockItems.length + outOfStockItems.length}</p>
      <p class="stat-label">Products Low / Out of Stock</p>
    </div>
  `;

  // ---- Revenue chart (last 7 days) ----
  const days = [];
  const dayRevenue = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push(key);
    dayRevenue[key] = 0;
  }
  orders.forEach(o => {
    const parsedDate = new Date(o.created_at);
    const key = (o.created_at && !isNaN(parsedDate.getTime()) ? parsedDate : new Date()).toISOString().slice(0, 10);
    if (dayRevenue.hasOwnProperty(key)) dayRevenue[key] += Number(o.total || 0);
  });

  new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5)),
      datasets: [{
        label: 'Revenue',
        data: days.map(d => dayRevenue[d]),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => symbol + v } } }
    }
  });

  // ---- Order type doughnut ----
  const typeCounts = { in_stock: 0, pre_order: 0, mixed: 0 };
  orders.forEach(o => { if (typeCounts.hasOwnProperty(o.order_type)) typeCounts[o.order_type]++; });

  new Chart(document.getElementById('typeChart'), {
    type: 'doughnut',
    data: {
      labels: ['In Stock', 'Pre-Order', 'Mixed'],
      datasets: [{
        data: [typeCounts.in_stock, typeCounts.pre_order, typeCounts.mixed],
        backgroundColor: ['#16a34a', '#f59e0b', '#4f46e5']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  // ---- Recent orders table ----
  const recent = [...orders].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 6);
  document.getElementById('recentOrdersBody').innerHTML = recent.length ? recent.map(o => `
    <tr>
      <td><a href="orders.html?id=${o.id}" style="font-weight:700;color:var(--primary);">${escapeHtml(o.order_number)}</a></td>
      <td>${escapeHtml(o.customer_name)}</td>
      <td>${typePill(o.order_type)}</td>
      <td>${fmtPrice(o.total, symbol)}</td>
      <td>${paymentPill(o.payment_status)}</td>
      <td>${fulfillmentPill(o.fulfillment_status)}</td>
      <td>${o.created_at && !isNaN(new Date(o.created_at).getTime()) ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="7">No orders yet.</td></tr>';

  // ---- Low stock table ----
  const lowStockAll = [...lowStockItems, ...outOfStockItems];
  document.getElementById('lowStockBody').innerHTML = lowStockAll.length ? lowStockAll.map(p => `
    <tr>
      <td><div class="table-prod-cell"><img src="${p.image_url}" alt="" loading="lazy" onerror="this.onerror=null;this.src='../images/logo.png';"><span style="font-weight:600;">${escapeHtml(p.name)}</span></div></td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td>${p.stock_quantity <= 0 ? '<span class="pill pill-red">Out of stock</span>' : `<span class="pill pill-amber">${p.stock_quantity} left</span>`}</td>
      <td>${typePill(p.product_type)}</td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="4">All products are well stocked. 🎉</td></tr>';
});
