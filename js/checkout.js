/* ==========================================================================
   Amah Wigs — Checkout page logic (coupon codes + real payment methods)

   Payment methods offered (each gated by admin Settings toggles):
   - Credit/Debit Card    -> Paystack Inline, channels: ['card']
   - Bank Transfer        -> Paystack Inline, channels: ['bank_transfer','bank']
   - Opay                 -> Paystack Inline, channels: ['mobile_money','bank_transfer']
     (Paystack has no distinct "Opay" channel in its Inline API; Opay wallet/
     bank payments route through Paystack's mobile_money/bank channels
     depending on the customer's bank — this is the closest faithful mapping.)
   - Offline Payment      -> admin-configured bank details shown to the
     customer; customer uploads a receipt image (compressed client-side)
     which is stored with the order for manual admin confirmation.

   NOTE: this is a static site with no backend, so Paystack payments are
   confirmed via the customer's browser callback only — there is no
   server-side transaction verification against the secret key. Treat this
   as "customer-confirmed" rather than fully server-verified.
   ========================================================================== */

let __appliedCoupon = null; // { code, discount_type, discount_value, id }
let __storeSettings = null;
let __selectedPaymentMethod = null;
let __offlineReceiptDataUrl = '';

function formatVariationInline(variation) {
  if (!variation) return '';
  return Object.entries(variation).map(([k, v]) => `${k}: ${v}`).join(', ');
}

function computeDiscount(subtotal) {
  if (!__appliedCoupon) return 0;
  if (__appliedCoupon.discount_type === 'percent') {
    return subtotal * (__appliedCoupon.discount_value / 100);
  }
  return Math.min(subtotal, __appliedCoupon.discount_value);
}

function paymentMethodOptions(settings) {
  const opts = [];
  if (settings.paystack_enabled && settings.paystack_public_key) {
    opts.push({ key: 'card', label: 'Credit / Debit Card', sub: 'Pay securely with your card via Paystack', icon: 'fa-credit-card' });
    opts.push({ key: 'bank_transfer', label: 'Bank Transfer', sub: 'Pay by transfer from your bank app via Paystack', icon: 'fa-building-columns' });
    opts.push({ key: 'opay', label: 'Opay', sub: 'Pay directly from your Opay wallet via Paystack', icon: 'fa-wallet' });
  }
  if (settings.offline_payment_enabled) {
    opts.push({ key: 'offline', label: 'Offline Payment', sub: 'Manual bank transfer — upload your receipt', icon: 'fa-money-bill-transfer' });
  }
  return opts;
}

function renderCheckout(symbol, settings) {
  const items = Cart.getItems();
  const container = document.getElementById('checkoutContent');

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-cart-shopping"></i>
        <h3>Your cart is empty</h3>
        <p>Add some products before checking out.</p>
        <a href="shop.html" class="btn btn-primary">Start Shopping</a>
      </div>`;
    return;
  }

  const subtotal = Cart.subtotal();
  const dueNowBase = Cart.dueNow();
  const discount = computeDiscount(subtotal);
  // Discount applies proportionally to the "due now" amount (deposit or full).
  const discountRatio = subtotal > 0 ? discount / subtotal : 0;
  const dueNow = Math.max(0, dueNowBase - dueNowBase * discountRatio);
  const laterDue = (subtotal - discount) - dueNow;
  const hasPreorder = Cart.hasPreorder();

  const lineItemsHtml = items.map(i => {
    const variationText = formatVariationInline(i.variation);
    return `
    <div class="mini-line">
      <img src="${i.image_url}" alt="${escapeHtml(i.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/logo.png';">
      <div>
        <div class="mini-line-name">${escapeHtml(i.name)}</div>
        <div class="mini-line-qty">Qty ${i.qty} ${i.product_type === 'pre_order' ? '· Pre-Order' : '· In Stock'}${variationText ? ' · ' + escapeHtml(variationText) : ''}</div>
      </div>
      <div class="mini-line-price">${fmtPrice(i.price * i.qty, symbol)}</div>
    </div>
  `;
  }).join('');

  const methods = paymentMethodOptions(settings);
  const methodsHtml = methods.length ? methods.map(m => `
    <label class="payment-method-option" data-method-option="${m.key}">
      <input type="radio" name="payment_method" value="${m.key}">
      <span class="pm-icon"><i class="fa-solid ${m.icon}"></i></span>
      <span>
        <div class="pm-label">${m.label}</div>
        <div class="pm-sub">${m.sub}</div>
      </span>
    </label>
  `).join('') : `
    <div style="padding:14px 16px;background:var(--gray-50);border:1px dashed var(--gray-300);border-radius:8px;font-size:13.5px;color:var(--gray-500);">
      <i class="fa-solid fa-triangle-exclamation"></i> No payment methods are configured yet. Your order will be recorded as <strong>payment pending</strong> — we'll contact you to arrange payment.
    </div>`;

  container.innerHTML = `
    <div class="checkout-layout">
      <div>
        <form id="checkoutForm">
          <div class="checkout-section">
            <h3><i class="fa-solid fa-user"></i> Contact Information</h3>
            <div class="form-row">
              <div class="form-group"><label>Full Name *</label><input type="text" name="customer_name" required></div>
              <div class="form-group"><label>Email *</label><input type="email" name="customer_email" required></div>
            </div>
            <div class="form-group"><label>Phone Number *</label><input type="tel" name="customer_phone" required></div>
          </div>

          <div class="checkout-section">
            <h3><i class="fa-solid fa-location-dot"></i> Shipping Address</h3>
            <div class="form-group"><label>Street Address *</label><input type="text" name="address_line" required></div>
            <div class="form-row">
              <div class="form-group"><label>City *</label><input type="text" name="city" required></div>
              <div class="form-group"><label>State / Province</label><input type="text" name="state"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Postal Code *</label><input type="text" name="postal_code" required></div>
              <div class="form-group"><label>Country *</label><input type="text" name="country" required></div>
            </div>
          </div>

          <div class="checkout-section">
            <h3><i class="fa-solid fa-credit-card"></i> Payment Method</h3>
            <div class="payment-method-list" id="paymentMethodList">${methodsHtml}</div>
            <div id="paymentMethodPanel"></div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" id="placeOrderBtn" style="padding:15px;font-size:16px;">
            <i class="fa-solid fa-lock"></i> Place Order — ${fmtPrice(dueNow, symbol)} due now
          </button>
        </form>
      </div>

      <div class="cart-summary" style="height:fit-content;">
        <h3 style="margin:0 0 16px;font-size:17px;">Order Summary</h3>
        <div style="max-height:260px;overflow-y:auto;margin-bottom:14px;">${lineItemsHtml}</div>

        <div class="form-group" style="margin-bottom:14px;">
          <label style="font-size:12.5px;">Coupon Code</label>
          <div style="display:flex;gap:8px;">
            <input type="text" id="couponInput" placeholder="Enter code" style="text-transform:uppercase;" value="${__appliedCoupon ? __appliedCoupon.code : ''}">
            <button type="button" class="btn btn-outline btn-sm" id="applyCouponBtn">${__appliedCoupon ? 'Remove' : 'Apply'}</button>
          </div>
          <p id="couponMsg" style="font-size:12px;margin:6px 0 0;${__appliedCoupon ? 'color:var(--success);' : 'color:var(--gray-500);'}">${__appliedCoupon ? `"${__appliedCoupon.code}" applied` : ''}</p>
        </div>

        <div class="summary-row"><span>Subtotal</span><span>${fmtPrice(subtotal, symbol)}</span></div>
        ${discount > 0 ? `<div class="summary-row" style="color:var(--success);"><span>Discount</span><span>-${fmtPrice(discount, symbol)}</span></div>` : ''}
        ${hasPreorder ? `
        <div class="summary-row"><span>Deposit / due now</span><span>${fmtPrice(dueNow, symbol)}</span></div>
        <div class="summary-row"><span>Balance due before shipment</span><span>${fmtPrice(laterDue, symbol)}</span></div>
        ` : ''}
        <div class="summary-row total"><span>Total due now</span><span>${fmtPrice(dueNow, symbol)}</span></div>
      </div>
    </div>
  `;

  document.getElementById('checkoutForm').addEventListener('submit', (e) => handlePlaceOrder(e, settings, dueNow, subtotal, discount));
  document.getElementById('applyCouponBtn').addEventListener('click', () => handleCouponToggle(symbol, settings));

  // Wire payment method selection
  document.querySelectorAll('#paymentMethodList input[name="payment_method"]').forEach(radio => {
    radio.addEventListener('change', () => {
      __selectedPaymentMethod = radio.value;
      document.querySelectorAll('.payment-method-option').forEach(el => el.classList.remove('selected'));
      radio.closest('.payment-method-option').classList.add('selected');
      renderPaymentMethodPanel(__selectedPaymentMethod, settings);
    });
  });
  // Auto-select the first available method for convenience.
  const firstRadio = document.querySelector('#paymentMethodList input[name="payment_method"]');
  if (firstRadio) {
    firstRadio.checked = true;
    __selectedPaymentMethod = firstRadio.value;
    firstRadio.closest('.payment-method-option').classList.add('selected');
    renderPaymentMethodPanel(__selectedPaymentMethod, settings);
  }
}

function renderPaymentMethodPanel(method, settings) {
  const panel = document.getElementById('paymentMethodPanel');
  __offlineReceiptDataUrl = '';
  if (!panel) return;

  if (method === 'card' || method === 'bank_transfer' || method === 'opay') {
    const labelMap = { card: 'card', bank_transfer: 'bank transfer', opay: 'Opay wallet' };
    panel.innerHTML = `
      <div class="payment-method-panel">
        <p style="margin:0;font-size:13px;color:var(--gray-700);">
          <i class="fa-solid fa-shield-halved" style="color:var(--success);"></i>
          You'll be securely redirected to Paystack to complete your ${labelMap[method]} payment when you click "Place Order" below.
        </p>
      </div>`;
    return;
  }

  if (method === 'offline') {
    const hasBankDetails = settings.offline_bank_name || settings.offline_account_number;
    panel.innerHTML = `
      <div class="payment-method-panel">
        ${hasBankDetails ? `
        <div class="offline-bank-details">
          ${settings.offline_bank_name ? `<div class="bank-row"><span>Bank Name</span><strong>${escapeHtml(settings.offline_bank_name)}</strong></div>` : ''}
          ${settings.offline_account_name ? `<div class="bank-row"><span>Account Name</span><strong>${escapeHtml(settings.offline_account_name)}</strong></div>` : ''}
          ${settings.offline_account_number ? `<div class="bank-row"><span>Account Number</span><strong>${escapeHtml(settings.offline_account_number)}</strong></div>` : ''}
        </div>
        ${settings.offline_instructions ? `<p style="font-size:12.5px;color:var(--gray-500);margin:0 0 14px;">${escapeHtml(settings.offline_instructions)}</p>` : ''}
        ` : `<p style="font-size:13px;color:var(--danger);margin:0 0 14px;">Bank details haven't been added yet — please contact the store before paying.</p>`}

        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;">Upload Payment Receipt *</label>
        <div class="receipt-upload-box" id="receiptUploadBox">
          <input type="file" id="receiptFileInput" accept="image/*" style="display:none;">
          <button type="button" class="btn btn-outline btn-sm" id="chooseReceiptBtn"><i class="fa-solid fa-upload"></i> Choose Receipt Image</button>
          <p style="font-size:11.5px;color:var(--gray-500);margin:8px 0 0;">Max 5MB. After transferring the amount above, upload a screenshot/photo of your receipt.</p>
          <img id="receiptPreview" class="receipt-preview" style="display:none;">
          <p id="receiptStatus" style="font-size:12px;color:var(--gray-500);margin-top:8px;"></p>
        </div>
      </div>`;

    document.getElementById('chooseReceiptBtn').addEventListener('click', () => document.getElementById('receiptFileInput').click());
    document.getElementById('receiptFileInput').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        document.getElementById('receiptStatus').textContent = 'Please choose an image file.';
        return;
      }
      if (file.size > MEDIA_MAX_IMAGE_BYTES) {
        document.getElementById('receiptStatus').textContent = `"${file.name}" is ${formatBytes(file.size)} — max 5MB.`;
        return;
      }
      document.getElementById('receiptStatus').textContent = 'Processing receipt image...';
      try {
        const dataUrl = await compressImageFile(file);
        __offlineReceiptDataUrl = dataUrl;
        const preview = document.getElementById('receiptPreview');
        preview.src = dataUrl;
        preview.style.display = 'block';
        document.getElementById('receiptStatus').textContent = 'Receipt ready.';
      } catch (err) {
        console.error(err);
        document.getElementById('receiptStatus').textContent = err.message || 'Failed to process receipt image.';
      }
    });
    return;
  }

  panel.innerHTML = '';
}

async function handleCouponToggle(symbol, settings) {
  const msgEl = document.getElementById('couponMsg');
  if (__appliedCoupon) {
    __appliedCoupon = null;
    renderCheckout(symbol, settings);
    return;
  }

  const codeInput = document.getElementById('couponInput');
  const code = (codeInput.value || '').trim().toUpperCase();
  if (!code) {
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'Enter a coupon code.';
    return;
  }

  try {
    const coupons = await API.listAll('coupons');
    const match = coupons.find(c => (c.code || '').toUpperCase() === code);
    const subtotal = Cart.subtotal();

    if (!match) {
      msgEl.style.color = 'var(--danger)';
      msgEl.textContent = 'Invalid coupon code.';
      return;
    }
    if (match.active === false) {
      msgEl.style.color = 'var(--danger)';
      msgEl.textContent = 'This coupon is no longer active.';
      return;
    }
    if (match.expires_at) {
      const exp = new Date(match.expires_at);
      if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'This coupon has expired.';
        return;
      }
    }
    if (match.max_uses > 0 && (match.used_count || 0) >= match.max_uses) {
      msgEl.style.color = 'var(--danger)';
      msgEl.textContent = 'This coupon has reached its usage limit.';
      return;
    }
    if (match.min_order > 0 && subtotal < match.min_order) {
      msgEl.style.color = 'var(--danger)';
      msgEl.textContent = `This coupon requires a minimum order of ${fmtPrice(match.min_order, symbol)}.`;
      return;
    }

    __appliedCoupon = match;
    renderCheckout(symbol, settings);
  } catch (e) {
    console.error(e);
    msgEl.style.color = 'var(--danger)';
    msgEl.textContent = 'Could not verify coupon. Try again.';
  }
}

// Builds the order payload common to every payment method.
function buildOrderPayload(formData, dueNow, subtotal, discount, paymentMethod, extra) {
  const items = Cart.getItems();
  const orderType = Cart.orderType();
  const shippingAddress = [
    formData.get('address_line'), formData.get('city'), formData.get('state'), formData.get('postal_code'), formData.get('country')
  ].filter(Boolean).join(', ');
  const couponNote = __appliedCoupon ? `Coupon applied: ${__appliedCoupon.code} (-${fmtPrice(discount, window.__currencySymbol)})` : '';

  return {
    id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    order_number: genOrderNumber(),
    customer_name: formData.get('customer_name'),
    customer_email: formData.get('customer_email'),
    customer_phone: formData.get('customer_phone'),
    shipping_address: shippingAddress,
    items: JSON.stringify(items.map(i => ({
      id: i.id, name: i.name, price: i.price, qty: i.qty, type: i.product_type, image: i.image_url, variation: i.variation || null
    }))),
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(dueNow.toFixed(2)),
    order_type: orderType,
    payment_method: paymentMethod,
    ...extra
  };
}

async function finalizeOrder(orderPayload) {
  const items = Cart.getItems();
  // Decrement stock for in-stock items (best-effort)
  for (const item of items) {
    try {
      const product = await API.get('products', item.id);
      if (item.product_type !== 'pre_order') {
        const newQty = Math.max(0, (product.stock_quantity || 0) - item.qty);
        await API.update('products', item.id, { stock_quantity: newQty });
      }
    } catch (err) { console.warn('Stock update failed for', item.id, err); }
  }

  await API.create('orders', orderPayload);

  // Best-effort: record coupon usage
  if (__appliedCoupon) {
    try {
      await API.update('coupons', __appliedCoupon.id, { used_count: (__appliedCoupon.used_count || 0) + 1 });
    } catch (err) { console.warn('Coupon usage update failed', err); }
  }

  Cart.clear();
  sessionStorage.setItem('lastOrderNumber', orderPayload.order_number);
  sessionStorage.setItem('lastOrderEmail', orderPayload.customer_email);
  window.location.href = 'order-success.html';
}

function paystackChannelsFor(method) {
  if (method === 'card') return ['card'];
  if (method === 'bank_transfer') return ['bank_transfer', 'bank'];
  if (method === 'opay') return ['mobile_money', 'bank_transfer', 'bank'];
  return undefined;
}

async function handlePlaceOrder(e, settings, dueNow, subtotal, discount) {
  e.preventDefault();
  const btn = document.getElementById('placeOrderBtn');
  const form = e.target;
  const method = __selectedPaymentMethod;

  const hasPaystackMethods = settings.paystack_enabled && settings.paystack_public_key;

  if ((method === 'card' || method === 'bank_transfer' || method === 'opay') && hasPaystackMethods) {
    if (typeof PaystackPop === 'undefined') {
      showToast('Payment library failed to load. Check your connection and try again.', 'fa-triangle-exclamation');
      return;
    }
    const fd = new FormData(form);
    const email = fd.get('customer_email');
    if (!email) { showToast('Please enter your email.', 'fa-triangle-exclamation'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening secure payment...';

    const orderPayload = buildOrderPayload(fd, dueNow, subtotal, discount, method, {
      payment_status: Cart.orderType() === 'in_stock' ? 'paid' : 'deposit_paid',
      fulfillment_status: Cart.orderType() === 'pre_order' ? 'awaiting_stock' : 'pending',
      notes: __appliedCoupon ? `Coupon applied: ${__appliedCoupon.code}` : ''
    });

    try {
      const handler = PaystackPop.setup({
        key: settings.paystack_public_key,
        email: email,
        amount: Math.max(100, Math.round(dueNow * 100)), // kobo/cents, min 1 unit
        currency: settings.paystack_currency || 'NGN',
        ref: orderPayload.order_number,
        channels: paystackChannelsFor(method),
        metadata: {
          custom_fields: [
            { display_name: 'Order Number', variable_name: 'order_number', value: orderPayload.order_number },
            { display_name: 'Customer Name', variable_name: 'customer_name', value: orderPayload.customer_name }
          ]
        },
        callback: function (response) {
          orderPayload.paystack_reference = response.reference || orderPayload.order_number;
          finalizeOrder(orderPayload).catch(err => {
            console.error(err);
            showToast('Payment succeeded but we could not save your order — please contact support with reference ' + orderPayload.paystack_reference, 'fa-triangle-exclamation');
          });
        },
        onClose: function () {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order — ${fmtPrice(dueNow, window.__currencySymbol)} due now`;
          showToast('Payment window closed — your order was not placed.', 'fa-triangle-exclamation');
        }
      });
      handler.openIframe();
    } catch (err) {
      console.error(err);
      showToast('Could not open payment window. Please try again.', 'fa-triangle-exclamation');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order — ${fmtPrice(dueNow, window.__currencySymbol)} due now`;
    }
    return;
  }

  if (method === 'offline' && settings.offline_payment_enabled) {
    if (!__offlineReceiptDataUrl) {
      showToast('Please upload your payment receipt before placing the order.', 'fa-triangle-exclamation');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing order...';
    const fd = new FormData(form);
    const orderPayload = buildOrderPayload(fd, dueNow, subtotal, discount, 'offline', {
      payment_status: 'pending',
      fulfillment_status: 'pending',
      notes: __appliedCoupon ? `Coupon applied: ${__appliedCoupon.code}` : '',
      offline_receipt_url: __offlineReceiptDataUrl
    });
    try {
      await finalizeOrder(orderPayload);
    } catch (err) {
      console.error(err);
      showToast('Could not place order. Please try again.', 'fa-triangle-exclamation');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order — ${fmtPrice(dueNow, window.__currencySymbol)} due now`;
    }
    return;
  }

  // No payment method configured/selected — record the order as payment-pending.
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Placing order...';
  const fd = new FormData(form);
  const orderPayload = buildOrderPayload(fd, dueNow, subtotal, discount, method || '', {
    payment_status: 'pending',
    fulfillment_status: 'pending',
    notes: __appliedCoupon ? `Coupon applied: ${__appliedCoupon.code}` : ''
  });
  try {
    await finalizeOrder(orderPayload);
  } catch (err) {
    console.error(err);
    showToast('Could not place order. Please try again.', 'fa-triangle-exclamation');
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('');
  const settings = await getSettings();
  __storeSettings = settings;
  window.__currencySymbol = settings.currency_symbol || '$';
  renderCheckout(window.__currencySymbol, settings);
});
