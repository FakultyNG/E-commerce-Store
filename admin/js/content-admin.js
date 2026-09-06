/* ==========================================================================
   Amah Wigs — Admin "Theme & Content" logic
   Loads (or lazily creates) the single `site_content` row and wires up the
   5 forms: Colors, Announcement, Hero, Trust Badges, Footer/Contact/Social.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initAdminLayout('content', 'Theme & Content');

  let content = { ...SITE_CONTENT_DEFAULTS };
  let rowExists = true;
  try {
    const c = await API.get('site_content', 'site_content');
    content = { ...SITE_CONTENT_DEFAULTS, ...c };
  } catch (e) {
    // Row doesn't exist yet on this install — we'll create it on first save.
    rowExists = false;
  }

  // Ensures the row exists (creates it once with full defaults+overrides),
  // then always PUTs the merged fields. Used by every form's submit handler.
  async function saveContentFields(fields) {
    if (!rowExists) {
      const toCreate = { ...SITE_CONTENT_DEFAULTS, ...content, ...fields, id: 'site_content' };
      await API.create('site_content', toCreate);
      rowExists = true;
      content = toCreate;
    } else {
      const updated = await API.update('site_content', 'site_content', fields);
      content = { ...SITE_CONTENT_DEFAULTS, ...updated };
    }
    // Refresh the shared cache used by getSiteContent() elsewhere, and
    // re-apply theme colors immediately so the admin can see the effect.
    if (typeof __siteContentCache !== 'undefined') {
      window.__siteContentCache = content;
    }
    applyThemeColors(content);
  }

  function setVal(form, name, val) {
    if (form.elements[name] != null) form.elements[name].value = val ?? '';
  }

  // ---- Wire color-picker <-> hex-text pairs bidirectionally ----
  function wireColorPair(pairKey) {
    const picker = document.querySelector(`input[type="color"][data-pair="${pairKey}"]`);
    const text = document.querySelector(`input[name="${pairKey}"]`);
    if (!picker || !text) return;
    const sync = (val) => {
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        picker.value = val;
        text.value = val;
      }
    };
    sync(content[pairKey] || SITE_CONTENT_DEFAULTS[pairKey]);
    picker.addEventListener('input', () => { text.value = picker.value; });
    text.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(text.value)) picker.value = text.value;
    });
  }

  // ---------------- Colors panel ----------------
  const colorsForm = document.getElementById('colorsForm');
  ['primary_color', 'accent_color', 'dark_color', 'success_color', 'danger_color'].forEach(wireColorPair);
  colorsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveColorsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await saveContentFields({
        primary_color: colorsForm.primary_color.value || SITE_CONTENT_DEFAULTS.primary_color,
        accent_color: colorsForm.accent_color.value || SITE_CONTENT_DEFAULTS.accent_color,
        dark_color: colorsForm.dark_color.value || SITE_CONTENT_DEFAULTS.dark_color,
        success_color: colorsForm.success_color.value || SITE_CONTENT_DEFAULTS.success_color,
        danger_color: colorsForm.danger_color.value || SITE_CONTENT_DEFAULTS.danger_color
      });
      showAdminToast('Team colors updated across the store');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save colors', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Colors';
  });

  // ---------------- Announcement panel ----------------
  const announceForm = document.getElementById('announceForm');
  setVal(announceForm, 'announcement_text', content.announcement_text);
  announceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveAnnounceBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await saveContentFields({ announcement_text: announceForm.announcement_text.value });
      showAdminToast('Announcement bar updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Announcement';
  });

  // ---------------- Hero panel ----------------
  const heroForm = document.getElementById('heroForm');
  ['hero_badge_text', 'hero_heading', 'hero_subheading', 'hero_image_url',
   'hero_cta_primary_text', 'hero_cta_primary_link', 'hero_cta_secondary_text', 'hero_cta_secondary_link']
    .forEach(f => setVal(heroForm, f, content[f]));

  // Show the currently-configured hero image (uploaded data URL or a plain
  // URL) in the preview thumbnail as soon as the panel loads.
  const heroImagePreview = document.getElementById('heroImagePreview');
  if (heroImagePreview) heroImagePreview.src = content.hero_image_url || SITE_CONTENT_DEFAULTS.hero_image_url || '';

  const heroImageFileInput = document.getElementById('heroImageFileInput');
  const uploadHeroImageBtn = document.getElementById('uploadHeroImageBtn');
  const heroImageUploadStatus = document.getElementById('heroImageUploadStatus');
  if (uploadHeroImageBtn && heroImageFileInput) {
    uploadHeroImageBtn.addEventListener('click', () => heroImageFileInput.click());
    heroImageFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showAdminToast('Please choose an image file.', 'fa-triangle-exclamation');
        return;
      }
      if (file.size > MEDIA_MAX_IMAGE_BYTES) {
        showAdminToast(`"${file.name}" is ${formatBytes(file.size)} — max 5MB.`, 'fa-triangle-exclamation');
        return;
      }
      heroImageUploadStatus.textContent = 'Compressing...';
      uploadHeroImageBtn.disabled = true;
      try {
        const dataUrl = await compressImageFile(file);
        heroForm.hero_image_url.value = dataUrl;
        if (heroImagePreview) heroImagePreview.src = dataUrl;
        heroImageUploadStatus.textContent = 'Ready — click Save Hero to apply.';
      } catch (err) {
        console.error(err);
        showAdminToast(err.message || 'Failed to process image', 'fa-triangle-exclamation');
        heroImageUploadStatus.textContent = '';
      }
      uploadHeroImageBtn.disabled = false;
    });
  }
  // If the admin edits the URL field directly, keep the preview in sync.
  if (heroForm.hero_image_url) {
    heroForm.hero_image_url.addEventListener('input', () => {
      if (heroImagePreview) heroImagePreview.src = heroForm.hero_image_url.value;
      if (heroImageUploadStatus) heroImageUploadStatus.textContent = '';
    });
  }

  heroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveHeroBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await saveContentFields({
        hero_badge_text: heroForm.hero_badge_text.value,
        hero_heading: heroForm.hero_heading.value,
        hero_subheading: heroForm.hero_subheading.value,
        hero_image_url: heroForm.hero_image_url.value,
        hero_cta_primary_text: heroForm.hero_cta_primary_text.value,
        hero_cta_primary_link: heroForm.hero_cta_primary_link.value,
        hero_cta_secondary_text: heroForm.hero_cta_secondary_text.value,
        hero_cta_secondary_link: heroForm.hero_cta_secondary_link.value
      });
      showAdminToast('Homepage hero updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Hero';
  });

  // ---------------- Homepage section headings panel ----------------
  const sectionsForm = document.getElementById('sectionsForm');
  ['categories_section_heading', 'featured_section_heading', 'preorder_section_heading', 'preorder_section_subtext']
    .forEach(f => setVal(sectionsForm, f, content[f]));
  sectionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveSectionsBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await saveContentFields({
        categories_section_heading: sectionsForm.categories_section_heading.value,
        featured_section_heading: sectionsForm.featured_section_heading.value,
        preorder_section_heading: sectionsForm.preorder_section_heading.value,
        preorder_section_subtext: sectionsForm.preorder_section_subtext.value
      });
      showAdminToast('Homepage section headings updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Section Headings';
  });

  // ---------------- Trust badges panel ----------------
  const trustForm = document.getElementById('trustForm');
  for (let i = 1; i <= 3; i++) {
    setVal(trustForm, `trust_badge_${i}_icon`, content[`trust_badge_${i}_icon`]);
    setVal(trustForm, `trust_badge_${i}_title`, content[`trust_badge_${i}_title`]);
    setVal(trustForm, `trust_badge_${i}_subtitle`, content[`trust_badge_${i}_subtitle`]);
    // Seed the icon preview's className from the loaded content, since the
    // icon field is now a hidden input driven by the icon-picker modal.
    const previewEl = document.getElementById(`trustIconPreview${i}`);
    const iconVal = content[`trust_badge_${i}_icon`] || SITE_CONTENT_DEFAULTS[`trust_badge_${i}_icon`];
    if (previewEl && iconVal) previewEl.className = `fa-solid ${iconVal}`;
    wireIconPicker(
      document.querySelector(`[data-icon-picker-btn="${i}"]`),
      document.getElementById(`trust_badge_${i}_icon`),
      previewEl
    );
  }
  trustForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveTrustBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      const fields = {};
      for (let i = 1; i <= 3; i++) {
        fields[`trust_badge_${i}_icon`] = trustForm[`trust_badge_${i}_icon`].value;
        fields[`trust_badge_${i}_title`] = trustForm[`trust_badge_${i}_title`].value;
        fields[`trust_badge_${i}_subtitle`] = trustForm[`trust_badge_${i}_subtitle`].value;
      }
      await saveContentFields(fields);
      showAdminToast('Trust badges updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Trust Badges';
  });

  // ---------------- Footer / Contact / Social panel ----------------
  const footerForm = document.getElementById('footerForm');
  ['footer_about_text', 'contact_email', 'contact_phone', 'contact_address', 'whatsapp_number',
   'social_instagram', 'social_facebook', 'social_tiktok', 'social_twitter']
    .forEach(f => setVal(footerForm, f, content[f]));
  footerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveFooterBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    try {
      await saveContentFields({
        footer_about_text: footerForm.footer_about_text.value,
        contact_email: footerForm.contact_email.value,
        contact_phone: footerForm.contact_phone.value,
        contact_address: footerForm.contact_address.value,
        whatsapp_number: footerForm.whatsapp_number.value,
        social_instagram: footerForm.social_instagram.value,
        social_facebook: footerForm.social_facebook.value,
        social_tiktok: footerForm.social_tiktok.value,
        social_twitter: footerForm.social_twitter.value
      });
      showAdminToast('Footer, contact & social updated');
    } catch (err) {
      console.error(err);
      showAdminToast('Failed to save', 'fa-triangle-exclamation');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Save Footer & Contact';
  });
});
