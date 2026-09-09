/* ==========================================================================
   Nexova Store — Admin Settings logic
   ========================================================================== */

const DELIVERY_CONFIG_DEFAULTS = {
  doorstep_fee: 6000,
  zones: [
    { key: 'pickup', label: 'Pickup', fees: { '1_2': 0, '2_4': 0, '4_plus': 0 } },
    { key: 'lagos_south_east', label: 'Lagos and South East states', fees: { '1_2': 6000, '2_4': 9000, '4_plus': 13000 } },
    { key: 'abuja', label: 'Abuja', fees: { '1_2': 10000, '2_4': 14000, '4_plus': 13000 } },
    { key: 'other_northern', label: 'Other Northern States', fees: { '1_2': 9000, '2_4': 15000, '4_plus': 19000 } }
  ]
};

function deliveryConfigFromSettings(settings) {
  let config = settings.delivery_config || {};
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch (e) { config = {}; }
  }
  const zoneMap = {};
  DELIVERY_CONFIG_DEFAULTS.zones.forEach(zone => { zoneMap[zone.key] = { ...zone, fees: { ...zone.fees } }; });
  (Array.isArray(config.zones) ? config.zones : []).forEach(zone => {
    if (!zone || !zone.key || !zoneMap[zone.key]) return;
    zoneMap[zone.key] = { ...zoneMap[zone.key], ...zone, fees: { ...zoneMap[zone.key].fees, ...(zone.fees || {}) } };
  });
  return {
    doorstep_fee: Number(config.doorstep_fee ?? DELIVERY_CONFIG_DEFAULTS.doorstep_fee) || 0,
    zones: DELIVERY_CONFIG_DEFAULTS.zones.map(zone => zoneMap[zone.key])
  };
}

function fillDeliveryForm(form, config) {
  form.doorstep_fee.value = config.doorstep_fee;
  config.zones.forEach(zone => {
    ['1_2', '2_4', '4_plus'].forEach(band => {
      const field = form[`${zone.key}_${band}`];
      if (field) field.value = Number((zone.fees || {})[band] || 0);
    });
  });
}

function readDeliveryForm(form) {
  return {
    doorstep_fee: Number(form.doorstep_fee.value) || 0,
    zones: DELIVERY_CONFIG_DEFAULTS.zones.map(zone => ({
      key: zone.key,
      label: zone.label,
      fees: {
        '1_2': Number(form[`${zone.key}_1_2`].value) || 0,
        '2_4': Number(form[`${zone.key}_2_4`].value) || 0,
        '4_plus': Number(form[`${zone.key}_4_plus`].value) || 0
      }
    }))
  };
}

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

  const deliveryForm = document.getElementById('deliveryForm');
  fillDeliveryForm(deliveryForm, deliveryConfigFromSettings(settings));

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

  deliveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveDeliveryBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await API.update('settings', 'store_settings', {
        delivery_config: readDeliveryForm(deliveryForm)
      });
      showAdminToast('Delivery fees updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save delivery fees', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Delivery Fees';
  });
});
