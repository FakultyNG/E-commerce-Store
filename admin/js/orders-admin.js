/* ==========================================================================
   Nexova Store — Admin Orders management logic
   ========================================================================== */

let __adminOrders = [];
let __ordersCurrencySymbol = '$';
let __orderTrackingNotes = [];
let __currentOrderId = null;

function parseItems(raw) {
  // The Table API sometimes returns rich_text JSON fields already parsed
  // into an array/object, and sometimes as a raw JSON string — handle both.
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function opPaymentPill(status) {
  const map = { paid: 'pill-green', deposit_paid: 'pill-indigo', pending: 'pill-gray', balance_due: 'pill-amber' };
  return `<span class="pill ${map[status] || 'pill-gray'}">${(status || '').replace('_', ' ')}</span>`;
}
function opFulfillmentPill(status) {
  const map = { pending: 'pill-gray', processing: 'pill-indigo', awaiting_stock: 'pill-amber', shipped: 'pill-indigo', delivered: 'pill-green', cancelled: 'pill-red' };
  return `<span class="pill ${map[status] || 'pill-gray'}">${(status || '').replace('_', ' ')}</span>`;
}
function opTypePill(type) {
  const map = { in_stock: 'pill-green', pre_order: 'pill-amber', mixed: 'pill-indigo' };
  const label = { in_stock: 'In Stock', pre_order: 'Pre-Order', mixed: 'Mixed' };
  return `<span class="pill ${map[type] || 'pill-gray'}">${label[type] || type}</span>`;
}
function paymentMethodLabel(method) {
  const map = { card: 'Credit/Debit Card', bank_transfer: 'Bank Transfer', offline: 'Offline Payment' };
  return map[method] || '—';
}

function renderOrdersTable() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const typeVal = document.getElementById('typeFilter').value;
  const fulfillVal = document.getElementById('fulfillmentFilter').value;

  let filtered = __adminOrders.filter(o => {
    if (search && !((o.order_number || '').toLowerCase().includes(search) || (o.customer_name || '').toLowerCase().includes(search) || (o.customer_email || '').toLowerCase().includes(search))) return false;
    if (typeVal && o.order_type !== typeVal) return false;
    if (fulfillVal && o.fulfillment_status !== fulfillVal) return false;
    return true;
  });

  filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const body = document.getElementById('ordersBody');
  if (!filtered.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="9">No orders found.</td></tr>';
    return;
  }

  body.innerHTML = filtered.map(o => {
    let itemCount = 0;
    try { itemCount = parseItems(o.items).reduce((s, i) => s + i.qty, 0); } catch (e) {}
    return `
    <tr>
      <td style="font-weight:700;">${escapeHtml(o.order_number)}</td>
      <td>${escapeHtml(o.customer_name)}<br><span style="font-size:11.5px;color:var(--gray-500);">${escapeHtml(o.customer_email)}</span></td>
      <td>${itemCount} item${itemCount === 1 ? '' : 's'}</td>
      <td>${opTypePill(o.order_type)}</td>
      <td>${fmtPrice(o.total, __ordersCurrencySymbol)}</td>
      <td>${opPaymentPill(o.payment_status)}</td>
      <td>${opFulfillmentPill(o.fulfillment_status)}</td>
      <td>${o.created_at && !isNaN(new Date(o.created_at).getTime()) ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
      <td><button class="btn btn-outline btn-sm" data-view="${o.id}"><i class="fa-solid fa-eye"></i> View</button></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => openOrderModal(btn.getAttribute('data-view'))));
}

function openOrderModal(id) {
  const o = __adminOrders.find(x => x.id === id);
  if (!o) return;
  let items = [];
  try { items = parseItems(o.items); } catch (e) {}

  document.getElementById('orderModalTitle').textContent = `Order ${o.order_number}`;
  document.getElementById('orderModalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
      <div>
        <p style="font-size:12px;color:var(--gray-500);margin:0 0 4px;text-transform:uppercase;font-weight:700;">Customer</p>
        <p style="margin:0;font-weight:600;">${escapeHtml(o.customer_name)}</p>
        <p style="margin:2px 0 0;font-size:13px;color:var(--gray-500);">${escapeHtml(o.customer_email)}</p>
        <p style="margin:2px 0 0;font-size:13px;color:var(--gray-500);">${escapeHtml(o.customer_phone)}</p>
      </div>
      <div>
        <p style="font-size:12px;color:var(--gray-500);margin:0 0 4px;text-transform:uppercase;font-weight:700;">Shipping Address</p>
        <p style="margin:0;font-size:13.5px;">${escapeHtml(o.shipping_address)}</p>
      </div>
    </div>

    <p style="font-size:12px;color:var(--gray-500);margin:0 0 8px;text-transform:uppercase;font-weight:700;">Items</p>
    <div style="border:1px solid var(--gray-200);border-radius:8px;padding:4px 12px;margin-bottom:18px;">
      ${items.map(i => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-100);">
          <img src="${i.image}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;background:var(--gray-100);" loading="lazy" onerror="this.onerror=null;this.src='../images/logo.png';">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13.5px;">${escapeHtml(i.name)}</div>
            <div style="font-size:12px;color:var(--gray-500);">Qty ${i.qty} · ${i.type === 'pre_order' ? 'Pre-Order' : 'In Stock'}</div>
          </div>
          <div style="font-weight:700;font-size:13.5px;">${fmtPrice(i.price * i.qty, __ordersCurrencySymbol)}</div>
        </div>
      `).join('')}
    </div>

    <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>Subtotal</span><span>${fmtPrice(o.subtotal, __ordersCurrencySymbol)}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>Delivery</span><span>${fmtPrice(o.delivery_cost || 0, __ordersCurrencySymbol)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px;margin-bottom:20px;"><span>Total Charged</span><span>${fmtPrice(o.total, __ordersCurrencySymbol)}</span></div>

    <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 14px;margin-bottom:18px;">
      <p style="font-size:12px;color:var(--gray-500);margin:0 0 4px;text-transform:uppercase;font-weight:700;">Delivery</p>
      <p style="margin:0;font-weight:600;font-size:13.5px;">${escapeHtml(o.delivery_option || '—')}</p>
      ${o.delivery_weight_band ? `<p style="margin:4px 0 0;font-size:12px;color:var(--gray-500);">Weight: ${escapeHtml(o.delivery_weight_band)}</p>` : ''}
      ${o.delivery_doorstep ? `<p style="margin:4px 0 0;font-size:12px;color:var(--gray-500);">Doorstep delivery included</p>` : ''}
    </div>

    <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 14px;margin-bottom:18px;">
      <p style="font-size:12px;color:var(--gray-500);margin:0 0 4px;text-transform:uppercase;font-weight:700;">Payment Method</p>
      <p style="margin:0;font-weight:600;font-size:13.5px;">${paymentMethodLabel(o.payment_method)}</p>
      ${o.paystack_reference ? `<p style="margin:4px 0 0;font-size:12px;color:var(--gray-500);">Paystack Ref: ${escapeHtml(o.paystack_reference)}</p>` : ''}
      ${o.offline_receipt_url ? `
        <p style="margin:10px 0 6px;font-size:12px;font-weight:700;color:var(--gray-700);">Uploaded Receipt</p>
        <a href="${o.offline_receipt_url}" target="_blank" rel="noopener">
          <img src="${o.offline_receipt_url}" alt="Payment receipt" style="max-width:180px;max-height:180px;border-radius:8px;border:1px solid var(--gray-200);display:block;object-fit:cover;">
        </a>
      ` : (o.payment_method === 'offline' ? '<p style="margin:6px 0 0;font-size:12px;color:var(--danger);">No receipt uploaded yet.</p>' : '')}
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Payment Status</label>
        <select id="editPaymentStatus">
          <option value="pending">Pending</option>
          <option value="deposit_paid">Deposit Paid</option>
          <option value="paid">Paid</option>
          <option value="balance_due">Balance Due</option>
        </select>
      </div>
      <div class="form-group">
        <label>Fulfillment Status</label>
        <select id="editFulfillmentStatus">
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="awaiting_stock">Awaiting Stock</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Internal Notes <span style="font-weight:400;color:var(--gray-500);">(staff only — never shown to the customer)</span></label>
      <textarea id="editNotes" rows="3" placeholder="Add internal notes about this order...">${escapeHtml(o.notes || '')}</textarea>
    </div>

    <div class="form-group" style="border-top:1px solid var(--gray-200);padding-top:16px;">
      <label>Customer-Visible Tracking Updates <span style="font-weight:400;color:var(--gray-500);">(shown to the customer on the Track Order page)</span></label>
      <div id="trackingNotesList" style="margin-bottom:10px;"></div>
      <div style="display:flex;gap:8px;">
        <input type="text" id="newTrackingNoteInput" placeholder="e.g. Your order has shipped via DHL, tracking #12345" style="flex:1;">
        <button type="button" class="btn btn-primary btn-sm" id="addTrackingNoteBtn"><i class="fa-solid fa-plus"></i> Add</button>
      </div>
    </div>
  `;

  document.getElementById('editPaymentStatus').value = o.payment_status;
  document.getElementById('editFulfillmentStatus').value = o.fulfillment_status;
  document.getElementById('orderModal').classList.add('show');
  document.getElementById('saveOrderStatusBtn').onclick = () => saveOrderStatus(o.id);

  __currentOrderId = o.id;
  loadTrackingNotes(o.id);

  document.getElementById('addTrackingNoteBtn').onclick = () => addTrackingNote(o.id);
  document.getElementById('newTrackingNoteInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTrackingNote(o.id); }
  });
}

async function loadTrackingNotes(orderId) {
  const list = document.getElementById('trackingNotesList');
  list.innerHTML = '<p style="font-size:12.5px;color:var(--gray-500);">Loading...</p>';
  try {
    const all = await API.listAll('order_tracking_notes');
    __orderTrackingNotes = all.filter(n => n.order_id === orderId)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    renderTrackingNotes();
  } catch (e) {
    console.error(e);
    list.innerHTML = '<p style="font-size:12.5px;color:var(--danger);">Failed to load tracking updates.</p>';
  }
}

function renderTrackingNotes() {
  const list = document.getElementById('trackingNotesList');
  if (!list) return;
  if (!__orderTrackingNotes.length) {
    list.innerHTML = '<p style="font-size:12.5px;color:var(--gray-500);">No tracking updates yet — add one below so the customer sees progress when they track this order.</p>';
    return;
  }
  list.innerHTML = __orderTrackingNotes.map(n => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;margin-bottom:8px;">
      <div>
        <p style="margin:0;font-size:13.5px;">${escapeHtml(n.message)}</p>
        <p style="margin:4px 0 0;font-size:11px;color:var(--gray-500);">${n.created_at && !isNaN(new Date(n.created_at).getTime()) ? new Date(n.created_at).toLocaleString() : ''}</p>
      </div>
      <button type="button" class="btn-icon-plain" data-remove-note="${n.id}" title="Remove" style="background:none;border:none;color:var(--gray-500);cursor:pointer;font-size:13px;padding:4px;"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
  list.querySelectorAll('[data-remove-note]').forEach(btn => {
    btn.addEventListener('click', () => removeTrackingNote(btn.getAttribute('data-remove-note')));
  });
}

async function addTrackingNote(orderId) {
  const input = document.getElementById('newTrackingNoteInput');
  const message = input.value.trim();
  if (!message) return;
  const btn = document.getElementById('addTrackingNoteBtn');
  btn.disabled = true;
  try {
    const payload = { id: 'otn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), order_id: orderId, message };
    const created = await API.create('order_tracking_notes', payload);
    __orderTrackingNotes.unshift(created);
    input.value = '';
    renderTrackingNotes();
    showAdminToast('Tracking update added');
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to add tracking update', 'fa-triangle-exclamation');
  }
  btn.disabled = false;
}

async function removeTrackingNote(id) {
  if (!confirm('Remove this tracking update? The customer will no longer see it.')) return;
  try {
    await API.remove('order_tracking_notes', id);
    __orderTrackingNotes = __orderTrackingNotes.filter(n => n.id !== id);
    renderTrackingNotes();
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to remove tracking update', 'fa-triangle-exclamation');
  }
}

async function saveOrderStatus(id) {
  const btn = document.getElementById('saveOrderStatusBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const payload = {
    payment_status: document.getElementById('editPaymentStatus').value,
    fulfillment_status: document.getElementById('editFulfillmentStatus').value,
    notes: document.getElementById('editNotes').value
  };

  try {
    await API.update('orders', id, payload);
    const idx = __adminOrders.findIndex(x => x.id === id);
    if (idx > -1) __adminOrders[idx] = { ...__adminOrders[idx], ...payload };
    renderOrdersTable();
    closeOrderModal();
    showAdminToast('Order updated');
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to update order', 'fa-triangle-exclamation');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('orders', 'Orders');

  try {
    const settings = await API.get('settings', 'store_settings');
    __ordersCurrencySymbol = settings.currency_symbol || '$';
  } catch (e) {}

  try {
    __adminOrders = await API.listAll('orders');
    renderOrdersTable();
  } catch (e) {
    console.error(e);
    document.getElementById('ordersBody').innerHTML = '<tr class="empty-row"><td colspan="9" style="color:var(--danger);">Failed to load orders.</td></tr>';
  }

  document.getElementById('searchInput').addEventListener('input', renderOrdersTable);
  document.getElementById('typeFilter').addEventListener('change', renderOrdersTable);
  document.getElementById('fulfillmentFilter').addEventListener('change', renderOrdersTable);
  document.getElementById('closeOrderModalBtn').addEventListener('click', closeOrderModal);
  document.getElementById('closeOrderModalBtn2').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', (e) => {
    if (e.target.id === 'orderModal') closeOrderModal();
  });

  // Deep link ?id=
  const deepId = new URLSearchParams(window.location.search).get('id');
  if (deepId) openOrderModal(deepId);
});
