/* ==========================================================================
   Amah Wigs — Site content & theme loader (colors, hero, trust badges,
   announcement bar, footer/contact/social) shared by every storefront page.
   ========================================================================== */

const SITE_CONTENT_DEFAULTS = {
  id: 'site_content',
  primary_color: '#0f172a',
  accent_color: '#f59e0b',
  dark_color: '#0f172a',
  success_color: '#16a34a',
  danger_color: '#dc2626',
  announcement_text: '🚀 Free shipping on orders over $75  |  Reserve pre-order items with a small deposit',
  hero_badge_text: 'New arrivals every week',
  hero_heading: 'Get it now, or reserve it early.',
  hero_subheading: "Shop in-stock items that ship today or place a deposit to pre-order before everyone else. One store, two ways to shop.",
  hero_image_url: 'images/hero-model-pink-set.jpg',
  hero_cta_primary_text: 'Shop In Stock',
  hero_cta_primary_link: 'shop.html?type=in_stock',
  hero_cta_secondary_text: 'Try pre-orders',
  hero_cta_secondary_link: 'shop.html?type=pre_order',
  trust_badge_1_icon: 'fa-shield-halved',
  trust_badge_1_title: 'Secure Payments',
  trust_badge_1_subtitle: '100% secure checkout',
  trust_badge_2_icon: 'fa-truck-fast',
  trust_badge_2_title: 'Fast Delivery',
  trust_badge_2_subtitle: 'Quick nationwide delivery',
  trust_badge_3_icon: 'fa-headset',
  trust_badge_3_title: '24/7 Support',
  trust_badge_3_subtitle: "We're here to help",
  featured_section_heading: 'Popular Products',
  preorder_section_heading: 'Pre-order',
  preorder_section_subtext: 'Reserve products with a small deposit — pay the rest when it ships.',
  categories_section_heading: 'Categories',
  footer_about_text: "Women's lifestyle & casual activewear — available now, or reserved ahead with pre-orders on upcoming releases.",
  contact_email: '',
  contact_phone: '',
  contact_address: '',
  whatsapp_number: '2348166292037',
  social_instagram: '',
  social_facebook: '',
  social_tiktok: '',
  social_twitter: '',
  free_shipping_threshold: 75
};

let __siteContentCache = null;
async function getSiteContent() {
  if (__siteContentCache) return __siteContentCache;
  try {
    const c = await API.get('site_content', 'site_content');
    __siteContentCache = { ...SITE_CONTENT_DEFAULTS, ...c };
  } catch (e) {
    __siteContentCache = { ...SITE_CONTENT_DEFAULTS };
  }
  return __siteContentCache;
}

// Convert a hex color to a slightly darker shade, used for hover states.
function shadeColor(hex, percent) {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h, 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00FF) + percent;
    let b = (num & 0x0000FF) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  } catch (e) { return hex; }
}

function applyThemeColors(content) {
  const root = document.documentElement.style;
  if (content.primary_color) {
    root.setProperty('--primary', content.primary_color);
    root.setProperty('--primary-dark', shadeColor(content.primary_color, -25));
    root.setProperty('--gray-900', content.primary_color);
    root.setProperty('--dark', content.primary_color);
  }
  if (content.accent_color) {
    root.setProperty('--accent', content.accent_color);
    root.setProperty('--accent-dark', shadeColor(content.accent_color, -35));
  }
  if (content.dark_color) {
    root.setProperty('--primary-dark', content.dark_color);
  }
  if (content.success_color) {
    root.setProperty('--success', content.success_color);
  }
  if (content.danger_color) {
    root.setProperty('--danger', content.danger_color);
  }
}

// Applies announcement bar, hero content, trust badges, footer text, and
// WhatsApp link wherever those elements exist on the current page.
function applySiteContentToDom(content) {
  applyThemeColors(content);

  document.querySelectorAll('.announce-bar').forEach(el => {
    if (content.announcement_text) el.textContent = content.announcement_text;
  });

  const heroBadge = document.getElementById('heroBadgeText');
  if (heroBadge) heroBadge.textContent = content.hero_badge_text || '';
  const heroHeading = document.getElementById('heroHeading');
  if (heroHeading) heroHeading.textContent = content.hero_heading || '';
  const heroSub = document.getElementById('heroSubheading');
  if (heroSub) heroSub.textContent = content.hero_subheading || '';
  const heroImg = document.getElementById('heroImage');
  if (heroImg && content.hero_image_url) heroImg.src = content.hero_image_url;
  const heroPrimaryBtn = document.getElementById('heroPrimaryBtn');
  if (heroPrimaryBtn) {
    heroPrimaryBtn.textContent = '';
    heroPrimaryBtn.insertAdjacentHTML('beforeend', `${escapeHtml(content.hero_cta_primary_text || 'Shop Now')} <i class="fa-solid fa-arrow-right"></i>`);
    if (content.hero_cta_primary_link) heroPrimaryBtn.setAttribute('href', content.hero_cta_primary_link);
  }
  const heroSecondaryBtn = document.getElementById('heroSecondaryBtn');
  if (heroSecondaryBtn) {
    heroSecondaryBtn.textContent = content.hero_cta_secondary_text || '';
    if (content.hero_cta_secondary_link) heroSecondaryBtn.setAttribute('href', content.hero_cta_secondary_link);
  }

  for (let i = 1; i <= 3; i++) {
    const iconEl = document.getElementById(`trustBadge${i}Icon`);
    const titleEl = document.getElementById(`trustBadge${i}Title`);
    const subEl = document.getElementById(`trustBadge${i}Subtitle`);
    if (iconEl && content[`trust_badge_${i}_icon`]) iconEl.className = `fa-solid ${content[`trust_badge_${i}_icon`]}`;
    if (titleEl) titleEl.textContent = content[`trust_badge_${i}_title`] || '';
    if (subEl) subEl.textContent = content[`trust_badge_${i}_subtitle`] || '';
  }

  const featuredHeading = document.getElementById('featuredSectionHeading');
  if (featuredHeading) featuredHeading.textContent = content.featured_section_heading || '';
  const preorderHeading = document.getElementById('preorderSectionHeading');
  if (preorderHeading) preorderHeading.textContent = content.preorder_section_heading || '';
  const preorderSubtext = document.getElementById('preorderSectionSubtext');
  if (preorderSubtext) preorderSubtext.textContent = content.preorder_section_subtext || '';
  const categoriesHeading = document.getElementById('categoriesSectionHeading');
  if (categoriesHeading) categoriesHeading.textContent = content.categories_section_heading || '';

  const footerAbout = document.getElementById('footerAboutText');
  if (footerAbout) footerAbout.textContent = content.footer_about_text || '';

  const socialWrap = document.getElementById('footerSocialLinks');
  if (socialWrap) {
    const links = [
      { url: content.social_instagram, icon: 'fa-instagram' },
      { url: content.social_facebook, icon: 'fa-facebook' },
      { url: content.social_tiktok, icon: 'fa-tiktok' },
      { url: content.social_twitter, icon: 'fa-x-twitter' }
    ].filter(s => s.url);
    socialWrap.innerHTML = links.map(s => `<a href="${s.url}" target="_blank" rel="noopener" style="margin-right:14px;"><i class="fa-brands ${s.icon}"></i></a>`).join('');
    socialWrap.style.display = links.length ? 'block' : 'none';
  }

  const contactWrap = document.getElementById('footerContactInfo');
  if (contactWrap) {
    const lines = [];
    if (content.contact_email) lines.push(`<li><i class="fa-solid fa-envelope"></i> ${escapeHtml(content.contact_email)}</li>`);
    if (content.contact_phone) lines.push(`<li><i class="fa-solid fa-phone"></i> ${escapeHtml(content.contact_phone)}</li>`);
    if (content.contact_address) lines.push(`<li><i class="fa-solid fa-location-dot"></i> ${escapeHtml(content.contact_address)}</li>`);
    contactWrap.innerHTML = lines.join('');
  }

  const waBtn = document.getElementById('whatsappFloatBtn');
  if (waBtn && content.whatsapp_number) {
    const message = encodeURIComponent(`Hi! I have a question about a product on Amah Wigs.`);
    waBtn.setAttribute('href', `https://wa.me/${content.whatsapp_number}?text=${message}`);
  }
}
