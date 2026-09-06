/* ==========================================================================
   WigsbyAmah — Shared searchable Font Awesome icon picker.
   Wire any "Choose Icon" button + hidden text input + preview <i> element
   with wireIconPicker(button, hiddenInput, previewIconEl). Clicking the
   button opens a modal grid of common icons with a live search box; the
   admin can also still type a class name manually into the hidden input's
   sibling text field if one exists via data-icon-text-input.
   ========================================================================== */

// A curated set of Font Awesome solid icons useful for a clothing/wig store
// (categories, trust badges, etc.) — searchable by keyword.
const ICON_PICKER_OPTIONS = [
  'fa-shirt', 'fa-vest', 'fa-socks', 'fa-hat-wizard', 'fa-mask', 'fa-glasses',
  'fa-wand-magic-sparkles', 'fa-scissors', 'fa-spa', 'fa-gem', 'fa-crown',
  'fa-layer-group', 'fa-box', 'fa-boxes-stacked', 'fa-bag-shopping', 'fa-store',
  'fa-tags', 'fa-tag', 'fa-percent', 'fa-gift', 'fa-shield-halved', 'fa-lock',
  'fa-truck-fast', 'fa-truck', 'fa-plane', 'fa-globe', 'fa-headset', 'fa-phone',
  'fa-envelope', 'fa-comments', 'fa-circle-question', 'fa-heart', 'fa-star',
  'fa-thumbs-up', 'fa-fire', 'fa-bolt', 'fa-clock', 'fa-calendar', 'fa-hourglass-half',
  'fa-check', 'fa-check-double', 'fa-circle-check', 'fa-rotate-left', 'fa-money-bill-wave',
  'fa-credit-card', 'fa-wallet', 'fa-dumbbell', 'fa-person-walking', 'fa-person-running',
  'fa-person-biking', 'fa-person-dress', 'fa-shoe-prints', 'fa-couch', 'fa-house',
  'fa-camera', 'fa-image', 'fa-images', 'fa-video', 'fa-palette', 'fa-brush',
  'fa-cloud-sun', 'fa-umbrella', 'fa-snowflake', 'fa-sun', 'fa-leaf', 'fa-seedling',
  'fa-user', 'fa-users', 'fa-user-tie', 'fa-face-smile', 'fa-magnifying-glass',
  'fa-map-pin', 'fa-location-dot', 'fa-flag', 'fa-award', 'fa-medal', 'fa-trophy'
];

let __iconPickerModalBuilt = false;
let __iconPickerCallback = null;

function ensureIconPickerModal() {
  if (__iconPickerModalBuilt) return;
  const div = document.createElement('div');
  div.className = 'modal-overlay';
  div.id = 'iconPickerModal';
  div.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
      <div class="modal-head">
        <h3>Choose an Icon</h3>
        <button class="modal-close" id="iconPickerCloseBtn" type="button"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <input type="text" id="iconPickerSearch" placeholder="Search icons e.g. shirt, truck, heart..." style="width:100%;padding:10px 13px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:14px;margin-bottom:14px;">
        <div id="iconPickerGrid" class="icon-picker-grid"></div>
      </div>
    </div>`;
  document.body.appendChild(div);
  __iconPickerModalBuilt = true;

  function renderGrid(filter) {
    const grid = document.getElementById('iconPickerGrid');
    const f = (filter || '').toLowerCase().trim();
    const list = f ? ICON_PICKER_OPTIONS.filter(i => i.replace('fa-', '').replace(/-/g, ' ').includes(f)) : ICON_PICKER_OPTIONS;
    if (!list.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;color:var(--gray-500);font-size:13px;text-align:center;padding:20px 0;">No icons match your search.</p>';
      return;
    }
    grid.innerHTML = list.map(icon => `
      <button type="button" class="icon-picker-item" data-icon="${icon}" title="${icon}">
        <i class="fa-solid ${icon}"></i>
        <span>${icon.replace('fa-', '').replace(/-/g, ' ')}</span>
      </button>`).join('');
    grid.querySelectorAll('.icon-picker-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const icon = btn.getAttribute('data-icon');
        if (__iconPickerCallback) __iconPickerCallback(icon);
        document.getElementById('iconPickerModal').classList.remove('show');
      });
    });
  }

  document.getElementById('iconPickerSearch').addEventListener('input', (e) => renderGrid(e.target.value));
  document.getElementById('iconPickerCloseBtn').addEventListener('click', () => document.getElementById('iconPickerModal').classList.remove('show'));
  div.addEventListener('click', (e) => { if (e.target.id === 'iconPickerModal') div.classList.remove('show'); });

  div.dataset.rendered = '0';
  div._renderGrid = renderGrid;
}

function openIconPicker(onChoose) {
  ensureIconPickerModal();
  __iconPickerCallback = onChoose;
  const modal = document.getElementById('iconPickerModal');
  const search = document.getElementById('iconPickerSearch');
  search.value = '';
  modal._renderGrid('');
  modal.classList.add('show');
  setTimeout(() => search.focus(), 50);
}

// Wires a "Choose Icon" trigger button. `hiddenInput` stores the fa-* class
// string that gets submitted with the form; `previewIconEl` (an <i>) shows
// a live preview of the currently chosen icon.
function wireIconPicker(triggerBtn, hiddenInput, previewIconEl) {
  if (!triggerBtn || !hiddenInput) return;
  triggerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openIconPicker((icon) => {
      hiddenInput.value = icon;
      if (previewIconEl) previewIconEl.className = 'fa-solid ' + icon;
    });
  });
}
