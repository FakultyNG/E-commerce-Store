/* ==========================================================================
   Nexova Store — Order tracking page logic
   ========================================================================== */

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];
const STATUS_LABELS = { pending: 'Order Placed', processing: 'Processing', awaiting_stock: 'Awaiting Release', shipped: 'Shipped', delivered: 'Delivered' };

function statusToStepIndex(status) {
  if (status === 'pending') return 0;
  if (status === 'awaiting_stock' || status === 'processing') return 1;
  if (status === 'shipped') return 2;
  if (status === 'delivered') return 3;
  return 0;
}

function parseItems(raw) {
  // The Table API sometimes returns rich_text JSON fields already parsed
  // into an array/object, and sometimes as a raw JSON string — handle both.
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return []; }
}

function renderTrackingNotesHtml(notes) {
  if (!notes || !notes.length) return '';
  const sorted = [...notes].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--gray-200);">
      <h4 style="font-size:14px;margin-bottom:12px;"><i class="fa-solid fa-clock-rotate-left"></i> Tracking Updates</h4>
      ${sorted.map(n => `
        <div style="display:flex;gap:12px;padding:10px 0;">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--primary);margin-top:6px;flex-shrink:0;"></div>
          <div>
            <p style="margin:0;font-size:13.5px;">${escapeHtml(n.message)}</p>
            <p style="margin:3px 0 0;font-size:11.5px;color:var(--gray-500);">${n.created_at && !isNaN(new Date(n.created_at).getTime()) ? new Date(n.created_at).toLocaleString() : ''}</p>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderOrderResult(order, symbol, trackingNotes) {
  const items = parseItems(order.items);
  const stepIdx = statusToStepIndex(order.fulfillment_status);
  const isCancelled = order.fulfillment_status === 'cancelled';
  const displayLabel = STATUS_LABELS[order.fulfillment_status] || order.fulfillment_status;

  const steps = ['pending', 'processing', 'shipped', 'delivered'];
  const stepLabels = ['Placed', order.order_type === 'pre_order' ? 'Awaiting Release' : 'Processing', 'Shipped', 'Delivered'];

  const stepsHtml = steps.map((s, idx) => {
    let cls = '';
    if (isCancelled) cls = '';
    else if (idx < stepIdx) cls = 'done';
    else if (idx === stepIdx) cls = 'active';
    return `
      <div class="status-step ${cls}">
        <div class="status-dot">${idx < stepIdx ? '<i class="fa-solid fa-check"></i>' : idx + 1}</div>
        <div class="status-label">${stepLabels[idx]}</div>
      </div>`;
  }).join('');

  const itemsHtml = items.map(i => `
    <div class="mini-line">
      <img src="${i.image}" alt="${escapeHtml(i.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/logo.png';">
      <div>
        <div class="mini-line-name">${escapeHtml(i.name)}</div>
        <div class="mini-line-qty">Qty ${i.qty} ${i.type === 'pre_order' ? '· Pre-Order' : '· In Stock'}</div>
      </div>
      <div class="mini-line-price">${fmtPrice(i.price * i.qty, symbol)}</div>
    </div>
  `).join('');

  const paymentBadgeColor = order.payment_status === 'paid' ? 'var(--success)' : order.payment_status === 'deposit_paid' ? 'var(--accent-dark)' : 'var(--gray-500)';

  document.getElementById('trackResult').innerHTML = `
    <div class="checkout-section">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin:0;">Order ${escapeHtml(order.order_number)}</h3>
          <p style="margin:4px 0 0;color:var(--gray-500);font-size:13.5px;">Placed by ${escapeHtml(order.customer_name)}</p>
        </div>
        <span style="font-weight:700;font-size:13px;color:${paymentBadgeColor};text-transform:capitalize;">
          <i class="fa-solid fa-circle" style="font-size:8px;"></i> ${order.payment_status.replace('_', ' ')}
        </span>
      </div>

      ${isCancelled ? `<div style="background:var(--danger-light);color:var(--danger);padding:14px;border-radius:8px;margin-top:18px;font-weight:600;"><i class="fa-solid fa-circle-xmark"></i> This order has been cancelled.</div>` : `
      <div class="status-track">${stepsHtml}</div>
      `}

      <div style="margin-top:24px;">
        <h4 style="font-size:14px;margin-bottom:10px;">Items</h4>
        ${itemsHtml}
      </div>

      <div class="summary-row" style="margin-top:16px;"><span>Subtotal</span><span>${fmtPrice(order.subtotal, symbol)}</span></div>
      <div class="summary-row total"><span>Total Paid Now</span><span>${fmtPrice(order.total, symbol)}</span></div>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gray-200);font-size:13px;color:var(--gray-500);">
        <i class="fa-solid fa-location-dot"></i> Shipping to: ${escapeHtml(order.shipping_address)}
      </div>

      ${renderTrackingNotesHtml(trackingNotes)}
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('track');
  const settings = await getSettings();
  window.__currencySymbol = settings.currency_symbol || '$';

  // Auto-fill if coming from a fresh order
  const lastOrderNumber = sessionStorage.getItem('lastOrderNumber');
  const lastEmail = sessionStorage.getItem('lastOrderEmail');
  if (lastOrderNumber) document.querySelector('input[name="order_number"]').value = lastOrderNumber;
  if (lastEmail) document.querySelector('input[name="email"]').value = lastEmail;

  document.getElementById('trackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('trackBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';

    const orderNumber = e.target.order_number.value.trim().toLowerCase();
    const email = e.target.email.value.trim().toLowerCase();

    try {
      const allOrders = await API.listAll('orders');
      const found = allOrders.find(o =>
        (o.order_number || '').toLowerCase() === orderNumber &&
        (o.customer_email || '').toLowerCase() === email
      );

      if (found) {
        let trackingNotes = [];
        try {
          const allNotes = await API.listAll('order_tracking_notes');
          trackingNotes = allNotes.filter(n => n.order_id === found.id);
        } catch (err) { console.error(err); }
        renderOrderResult(found, window.__currencySymbol, trackingNotes);
      } else {
        document.getElementById('trackResult').innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-circle-question"></i>
            <h3>Order not found</h3>
            <p>Please double-check your order number and email address.</p>
          </div>`;
      }
    } catch (err) {
      console.error(err);
      document.getElementById('trackResult').innerHTML = `<p style="color:var(--danger);">Something went wrong. Please try again.</p>`;
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Track Order';
  });
});
