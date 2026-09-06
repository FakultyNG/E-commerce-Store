/* ==========================================================================
   WigsbyAmah — Admin Coupons CRUD logic
   ========================================================================== */

let __adminCoupons = [];
let __couponsCurrencySymbol = '$';

function renderCouponsTable() {
  const body = document.getElementById('couponsBody');
  if (!__adminCoupons.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="7">No coupons yet. Click "New Coupon" to add one.</td></tr>';
    return;
  }

  body.innerHTML = __adminCoupons.map(c => {
    const discountText = c.discount_type === 'percent' ? `${c.discount_value}% off` : `${fmtPrice(c.discount_value, __couponsCurrencySymbol)} off`;
    const usageText = c.max_uses > 0 ? `${c.used_count || 0} / ${c.max_uses}` : `${c.used_count || 0} / ∞`;
    const expiresText = c.expires_at ? c.expires_at : 'Never';
    const isExpired = c.expires_at && !isNaN(new Date(c.expires_at).getTime()) && new Date(c.expires_at).getTime() < Date.now();
    const isMaxedOut = c.max_uses > 0 && (c.used_count || 0) >= c.max_uses;
    let statusPill;
    if (c.active === false) statusPill = '<span class="pill pill-gray">Disabled</span>';
    else if (isExpired) statusPill = '<span class="pill pill-red">Expired</span>';
    else if (isMaxedOut) statusPill = '<span class="pill pill-red">Used Up</span>';
    else statusPill = '<span class="pill pill-green">Active</span>';

    return `
    <tr>
      <td style="font-weight:800;letter-spacing:0.5px;">${escapeHtml(c.code)}</td>
      <td>${discountText}</td>
      <td>${c.min_order > 0 ? fmtPrice(c.min_order, __couponsCurrencySymbol) : '—'}</td>
      <td>${usageText}</td>
      <td>${escapeHtml(expiresText)}</td>
      <td>${statusPill}</td>
      <td>
        <button class="btn btn-outline btn-sm" data-edit="${c.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" data-delete="${c.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openCouponModal(btn.getAttribute('data-edit'))));
  body.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteCoupon(btn.getAttribute('data-delete'))));
}

function openCouponModal(id) {
  const form = document.getElementById('couponForm');
  form.reset();
  if (id) {
    const c = __adminCoupons.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modalTitle').textContent = 'Edit Coupon';
    form.id.value = c.id;
    form.code.value = c.code || '';
    form.discount_type.value = c.discount_type || 'percent';
    form.discount_value.value = c.discount_value || 0;
    form.min_order.value = c.min_order || 0;
    form.max_uses.value = c.max_uses || 0;
    form.expires_at.value = c.expires_at || '';
    form.active.checked = c.active !== false;
  } else {
    document.getElementById('modalTitle').textContent = 'New Coupon';
    form.id.value = '';
    form.discount_type.value = 'percent';
    form.active.checked = true;
  }
  document.getElementById('couponModal').classList.add('show');
}

function closeCouponModal() {
  document.getElementById('couponModal').classList.remove('show');
}

async function deleteCoupon(id) {
  const c = __adminCoupons.find(x => x.id === id);
  if (!confirm(`Delete coupon "${c ? c.code : ''}"?`)) return;
  try {
    await API.remove('coupons', id);
    __adminCoupons = __adminCoupons.filter(x => x.id !== id);
    renderCouponsTable();
    showAdminToast('Coupon deleted');
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to delete coupon', 'fa-triangle-exclamation');
  }
}

async function handleCouponFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const saveBtn = document.getElementById('saveCouponBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const fd = new FormData(form);
  const id = fd.get('id');
  const payload = {
    code: (fd.get('code') || '').trim().toUpperCase(),
    discount_type: fd.get('discount_type'),
    discount_value: Number(fd.get('discount_value')) || 0,
    min_order: Number(fd.get('min_order')) || 0,
    max_uses: Number(fd.get('max_uses')) || 0,
    expires_at: fd.get('expires_at') || '',
    active: fd.get('active') === 'on'
  };

  try {
    if (id) {
      payload.used_count = (__adminCoupons.find(x => x.id === id) || {}).used_count || 0;
      await API.update('coupons', id, payload);
      const idx = __adminCoupons.findIndex(x => x.id === id);
      if (idx > -1) __adminCoupons[idx] = { ...__adminCoupons[idx], ...payload };
      showAdminToast('Coupon updated');
    } else {
      payload.id = 'cpn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      payload.used_count = 0;
      const created = await API.create('coupons', payload);
      __adminCoupons.unshift(created);
      showAdminToast('Coupon created');
    }
    closeCouponModal();
    renderCouponsTable();
  } catch (err) {
    console.error(err);
    showAdminToast('Failed to save coupon', 'fa-triangle-exclamation');
  }
  saveBtn.disabled = false;
  saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Coupon';
}

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('coupons', 'Coupons');

  try {
    const settings = await API.get('settings', 'store_settings');
    __couponsCurrencySymbol = settings.currency_symbol || '$';
  } catch (e) {}

  try {
    __adminCoupons = await API.listAll('coupons');
    renderCouponsTable();
  } catch (e) {
    console.error(e);
    document.getElementById('couponsBody').innerHTML = '<tr class="empty-row"><td colspan="7" style="color:var(--danger);">Failed to load coupons.</td></tr>';
  }

  document.getElementById('newCouponBtn').addEventListener('click', () => openCouponModal(null));
  document.getElementById('closeModalBtn').addEventListener('click', closeCouponModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeCouponModal);
  document.getElementById('couponForm').addEventListener('submit', handleCouponFormSubmit);
  document.getElementById('couponModal').addEventListener('click', (e) => {
    if (e.target.id === 'couponModal') closeCouponModal();
  });
});
