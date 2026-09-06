/* ==========================================================================
   Nexova Store — Admin Settings logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('settings', 'Settings');

  let settings;
  try {
    settings = await API.get('settings', 'store_settings');
  } catch (e) {
    console.error(e);
    showAdminToast('Failed to load settings', 'fa-triangle-exclamation');
    return;
  }

  const storeForm = document.getElementById('storeForm');
  storeForm.store_name.value = settings.store_name || '';
  storeForm.currency_symbol.value = settings.currency_symbol || '$';

  const credsForm = document.getElementById('credsForm');
  credsForm.admin_username.value = settings.admin_username || '';
  credsForm.admin_password.value = settings.admin_password || '';

  const paystackForm = document.getElementById('paystackForm');
  paystackForm.paystack_enabled.checked = !!settings.paystack_enabled;
  paystackForm.paystack_public_key.value = settings.paystack_public_key || '';
  paystackForm.paystack_secret_key.value = settings.paystack_secret_key || '';
  paystackForm.paystack_currency.value = settings.paystack_currency || 'NGN';

  const offlineForm = document.getElementById('offlineForm');
  offlineForm.offline_payment_enabled.checked = !!settings.offline_payment_enabled;
  offlineForm.offline_bank_name.value = settings.offline_bank_name || '';
  offlineForm.offline_account_name.value = settings.offline_account_name || '';
  offlineForm.offline_account_number.value = settings.offline_account_number || '';
  offlineForm.offline_instructions.value = settings.offline_instructions || '';

  storeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveStoreBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await API.update('settings', 'store_settings', {
        store_name: storeForm.store_name.value,
        currency_symbol: storeForm.currency_symbol.value
      });
      showAdminToast('Store info updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Store Info';
  });

  credsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveCredsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await API.update('settings', 'store_settings', {
        admin_username: credsForm.admin_username.value,
        admin_password: credsForm.admin_password.value
      });
      showAdminToast('Credentials updated. Use them next time you log in.');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Update Credentials';
  });

  paystackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('savePaystackBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await API.update('settings', 'store_settings', {
        paystack_enabled: paystackForm.paystack_enabled.checked,
        paystack_public_key: paystackForm.paystack_public_key.value.trim(),
        paystack_secret_key: paystackForm.paystack_secret_key.value.trim(),
        paystack_currency: paystackForm.paystack_currency.value
      });
      showAdminToast('Paystack settings updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Paystack Settings';
  });

  offlineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveOfflineBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await API.update('settings', 'store_settings', {
        offline_payment_enabled: offlineForm.offline_payment_enabled.checked,
        offline_bank_name: offlineForm.offline_bank_name.value.trim(),
        offline_account_name: offlineForm.offline_account_name.value.trim(),
        offline_account_number: offlineForm.offline_account_number.value.trim(),
        offline_instructions: offlineForm.offline_instructions.value.trim()
      });
      showAdminToast('Offline payment settings updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Offline Payment Settings';
  });
});
