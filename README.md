# WigsbyAmah — Women's Lifestyle & Activewear Store (Stocked & Pre-Order)

A static e-commerce storefront selling **women's lifestyle and casual activewear clothing** — both **in-stock products (ship now)** and **pre-order products (reserve now, ship later)** — with a simple, password-guarded **Admin Dashboard** to manage products, orders, and store settings — all built with HTML, CSS, JavaScript, and the RESTful Table API (no backend server).

## 🎯 Project Goal

Give a small women's clothing/activewear merchant a lightweight storefront that can sell:
1. **In-stock items** — customer pays in full at checkout, item ships immediately.
2. **Pre-order items** — customer pays a configurable **deposit %** (or full price) to reserve an upcoming item; the remaining balance is tracked as "due before shipment."

The admin can manage the whole catalog and fulfil orders from one dashboard, without any code changes.

## 🎨 UI Design (Updated)

The storefront now uses a **minimal black/white "app style" theme** modeled on a mobile e-commerce app reference (FakultyNG-style):
- **Desktop**: Full header (logo, nav links, search bar, wishlist/cart/admin icons), hero banner card, circular category icon row, product grid with heart wishlist icons on every card.
- **Mobile (≤720px)**: App-style top bar with a hamburger menu, centered logo, and cart icon; a search bar row underneath; a dropdown menu on hamburger tap; and a **fixed bottom navigation bar** with 5 tabs — **Home, Categories, Wishlist, Orders, Account** — visible on every storefront page. Product grids collapse to 3 (then 2) columns and cards simplify (badges/actions hidden, name+price only) for a native-app feel.
- Same visual theme (colors, radii, spacing, icon-circle categories, heart wishlist buttons) is carried through Shop, Product Detail, Cart, Checkout, Order Success, Track Order, Wishlist, and the new Account page.

### New: Wishlist
- Heart icon on every product card and on the product detail page toggles a **localStorage-based wishlist** (no login required).
- `wishlist.html` — lists all wishlisted products (or an empty state); accessible from the header, bottom nav, and Account page.

### New: Account page
- `account.html` — a lightweight app-style "account" menu (Track Order, Wishlist, Cart, Pre-Orders, All Products, Admin Dashboard). No real customer login exists — see Security Note.

## ✅ Currently Completed Features

### Storefront
- **Homepage** (`index.html`) — hero banner, circular category icons, popular products grid, pre-order spotlight, trust badges row.
- **Shop / catalog page** (`shop.html`) — filter by product type (In Stock / Pre-Order), category, max price (slider), text search, and sort (price/name); URL query params supported (`?type=`, `?category=`, `?q=`).
- **Product detail page** (`product.html?id=...`) — image, price (with compare-at/sale price), live stock/pre-order messaging, deposit breakdown panel for pre-orders, quantity selector, wishlist toggle, add-to-cart/reserve button, related products.
- **Cart** (`cart.html`) — persisted in `localStorage`, quantity edit/remove, shows subtotal, "due now" vs "balance due before shipment" split when pre-order items are present.
- **Checkout** (`checkout.html`) — customer/shipping form, order summary, simulated payment (demo only — no real payment gateway), creates an order record, decrements stock for in-stock items.
- **Order success page** (`order-success.html`) — shows the generated order number.
- **Order tracking** (`track-order.html`) — customer looks up an order by order number + email, sees a fulfillment progress tracker (Placed → Processing/Awaiting Release → Shipped → Delivered), payment status, and any **customer-visible tracking updates** the admin has posted (see Orders admin below).
- **Wishlist** (`wishlist.html`) — localStorage-based saved products list.
- **Account** (`account.html`) — app-style account/menu page (bottom-nav "Account" destination).

### Admin Dashboard (`/admin`)
- **Branding** — the "WigsbyAmah" text logo is used across the storefront header/footer and the admin login/sidebar.
- **Login** (`admin/login.html`) — username/password gate stored in the `settings` table (client-side demo auth only — see Security Note below).
- **Dashboard** (`admin/index.html`) — KPI cards, 7-day revenue line chart, order-type doughnut chart (Chart.js), recent orders table, low-stock alert table.
- **Products** (`admin/products.html`) — full CRUD, plus:
  - **Manual photo & video upload** — upload multiple photos (JPG, PNG, WEBP, GIF, HEIC, etc.) and/or one video (MP4, WEBM, MOV) per product directly from your device. **Limits: 5MB per photo, 25MB for the video** — oversized/unsupported files are rejected client-side with a clear message. Photos are automatically compressed client-side to fit the Table API's per-field size cap (~2M characters); videos are automatically split into chunks (`media_chunks` table) and reassembled for playback — this is what fixed the previous "Failed to save product" error on real uploaded photos/videos.
  - **Drag-and-drop reordering** — reorder photos/video by dragging the handle; the first photo becomes the storefront cover image. (Fixed: thumbnails/buttons are now `draggable="false"` so the browser's native image/video drag no longer hijacks the reorder gesture.)
  - **Category select with quick-add** — pick a category from a dropdown sourced from the Categories admin; the first option "+ Add New Category…" opens a small modal to create a category (name + icon) on the spot, then auto-selects it and resumes the product form.
  - **Product variations** — add option groups such as Color, Size, etc. (custom names + values); shown as selectable chips on the product page and carried through cart/checkout as distinct line items.
- **Categories** (`admin/categories.html`) — create/edit/delete/reorder storefront categories (name, icon via the visual searchable icon picker, order, active/inactive) driving the homepage category row and shop filter.
- **Coupons** (`admin/coupons.html`) — create/edit/delete discount codes: percent or fixed discount, min order, max uses, expiry, active toggle, usage count; fully wired into checkout.
- **Theme & Content** (`admin/content.html`) — **this is where to change your team/brand colors** (primary, accent, dark, success, danger, each with a color picker + hex input, applied site-wide instantly), plus announcement bar, homepage hero (**including uploading a hero image file directly, max 5MB, compressed client-side — or still pasting a URL**), homepage section headings, trust badges (**icon now chosen visually via the searchable icon picker**), and footer/contact/social + free-shipping threshold.
- **Orders** (`admin/orders.html`) — list/search/filter orders; view full detail (incl. selected variation, coupon applied) and update payment/fulfillment status, internal (staff-only) notes, **and post customer-visible tracking updates** (add/remove short status messages that appear as a timeline on the customer's Track Order page — separate from internal notes).
- **Reusable icon picker** (`admin/js/icon-picker.js`) — a shared, lazily-built modal with a live-searchable grid of curated Font Awesome icons. Used anywhere an icon needs to be chosen: Categories, the Products "Quick Add Category" modal, and the 3 Trust Badges in Theme & Content.
- **Settings** (`admin/settings.html`) — store name & currency symbol, admin username/password.

## 🔗 Functional Entry Points (Pages & Params)

| Path | Purpose | Query Params |
|---|---|---|
| `/index.html` | Homepage | — |
| `/shop.html` | Product catalog with filters | `type=in_stock\|pre_order`, `category=<name>`, `q=<search text>` |
| `/product.html` | Product detail | `id=<product id>` |
| `/cart.html` | Shopping cart | — |
| `/checkout.html` | Checkout form | — |
| `/order-success.html` | Order confirmation | (reads `sessionStorage` from checkout) |
| `/track-order.html` | Track an order | — (form: order number + email) |
| `/wishlist.html` | Saved/wishlisted products | — (reads `localStorage`) |
| `/account.html` | App-style account menu | — |
| `/admin/login.html` | Admin sign-in | — |
| `/admin/index.html` | Admin dashboard/stats | — |
| `/admin/products.html` | Manage products (media upload/reorder, variations) | `new=1` opens the "new product" modal on load |
| `/admin/categories.html` | Manage storefront categories | — |
| `/admin/coupons.html` | Manage discount coupon codes | — |
| `/admin/content.html` | Theme/brand colors + homepage/footer content | — |
| `/admin/orders.html` | Manage orders | `id=<order id>` opens that order's detail modal |
| `/admin/settings.html` | Store & credential settings | — |

## 🗄️ Data Models (RESTful Table API)

### `products`
`id, name, description, price, compare_at_price, category, image_url, gallery, stock_quantity, product_type (in_stock|pre_order), status (active|inactive), sku, release_date, deposit_percent, featured`

### `orders`
`id, order_number, customer_name, customer_email, customer_phone, shipping_address, items (JSON string), subtotal, total, order_type (in_stock|pre_order|mixed), payment_status (pending|deposit_paid|paid|balance_due), fulfillment_status (pending|processing|awaiting_stock|shipped|delivered|cancelled), notes`

### `settings` (single row, id = `store_settings`)
`id, store_name, admin_username, admin_password, currency_symbol`

### `categories`
`id, name, icon (Font Awesome class), image_url, sort_order, status (active|inactive)`

### `coupons`
`id, code, discount_type (percent|fixed), discount_value, min_order, max_uses, used_count, expires_at, active`

### `product_media`
`id, product_id, media_type (image|video), url (hosted link, or a client-side-compressed data-URL for uploaded photos, or empty when the video is stored chunked), is_chunked (bool), sort_order`

### `media_chunks`
`id, media_id, chunk_index, chunk_data` — large uploaded videos are split into ~1.7M-character base64 slices here (linked by `media_id`) and reassembled into a playable Blob URL on demand, since the Table API enforces a hard cap of roughly 2.0–2.1 million characters per text/rich_text field.

### `product_variations`
`id, product_id, group_name (e.g. Color, Size), group_values (array), sort_order`

### `order_tracking_notes`
`id, order_id, message` — customer-visible short status updates an admin posts against an order (e.g. "Shipped via DHL, tracking #12345"); shown as a timeline on the customer's Track Order page. Separate from the internal-only `orders.notes` field, which is never shown to customers.

### `site_content` (single row, id = `site_content`) — powers "Theme & Content"
`id, primary_color, accent_color, dark_color, success_color, danger_color, announcement_text, hero_badge_text, hero_heading, hero_subheading, hero_image_url, hero_cta_primary_text/link, hero_cta_secondary_text/link, trust_badge_1..3_icon/title/subtitle, featured_section_heading, preorder_section_heading, preorder_section_subtext, categories_section_heading, footer_about_text, contact_email, contact_phone, contact_address, whatsapp_number, social_instagram/facebook/tiktok/twitter, free_shipping_threshold`

> **Note on uploaded media**: since this is a static site with no server-side file storage, uploaded photos/video are converted client-side to base64 data URLs. The Table API caps any single text/rich_text field at roughly 2.0–2.1 million characters, so: **photos** are automatically resized/re-encoded (JPEG, progressively smaller) until they fit comfortably under that cap before being stored in `product_media.url` (also used for the Theme & Content hero image upload); **videos** cannot be meaningfully compressed in-browser, so their data is split into multiple `media_chunks` rows and reassembled into a Blob URL for playback.

Current catalog: 12 women's lifestyle/activewear products (leggings, hoodies, tanks, bike shorts, joggers, cardigan, sports bra, sweatshirt, wide-leg pants — all in stock; plus a windbreaker jacket, a matching activewear set, and a linen wrap dress as pre-orders).

All tables are accessed via the built-in RESTful Table API (`tables/{table}`), used through the `js/api.js` helper (`API.list/get/create/update/remove/listAll`).

## 🧠 How the Pre-Order Logic Works

- Each product has a `product_type`. Pre-order products also have a `deposit_percent` (0–100) and an optional `release_date`.
- In the cart/checkout, **"due now"** = full price for in-stock items + `deposit_percent`% of price for pre-order items. The remainder is shown as **"balance due before shipment"** (tracked manually by the admin — no second automated charge, since this is a static site with a simulated payment step).
- Orders are tagged `order_type`: `in_stock`, `pre_order`, or `mixed` (cart contained both).
- Placing an order automatically decrements `stock_quantity` for in-stock line items (best-effort client-side update).

## 🔐 Security Note (Important)

The admin login is a **client-side convenience gate only** — it checks the entered username/password against the `settings` table and stores a flag in `sessionStorage`. Because this is a static site with no server, **anyone who views the page source or the network request can see how it works, and the credentials themselves are stored in plain text in the table data.** Do not use a real/sensitive password here, and do not treat this as protecting confidential business or customer data. If you need real authentication, you would need a proper backend/auth provider, which is outside the scope of a static site.

## 🚧 Not Yet Implemented / Known Limitations

- No real payment gateway integration (checkout "payment" is simulated — required for a static, backend-free site).
- No automated email notifications (order confirmation is shown on-screen only).
- Balance-due collection for pre-orders (the second charge before shipment) is **tracked manually** by the admin, not automatically billed.
- No multi-admin roles/permissions — a single shared admin login.
- No inventory reservation locking — concurrent checkouts could theoretically both succeed against low stock (acceptable for a demo store).
- Coupon discount is recorded as a text note on the order (not a dedicated column), since the live `orders` table cannot have new columns added via redeploy without a DB rebuild.
- Uploaded photos/videos are stored as base64 data URLs (no true server-side file storage in this static-site environment) — fine at the enforced 5MB/25MB limits, but not ideal for a huge catalog.

## 🛠️ Recommended Next Steps

1. Connect a real payment processor via a secure backend if this evolves beyond a demo.
2. Add email notifications (would require a backend/email service).
3. ~~Add product image/video upload~~ — done (client-side upload with size/type limits); a true CDN/object-storage pipeline would be a further upgrade.
4. Add pagination to the admin Orders/Products tables if the catalog/order volume grows large.
5. Add a "balance due" reminder workflow for pre-orders approaching their release date.
6. Give coupons/discounts dedicated order columns (requires a DB rebuild, which wipes existing data) instead of a text note.

## 📁 Project Structure

```
index.html, shop.html, product.html, cart.html, checkout.html,
order-success.html, track-order.html, wishlist.html, account.html
css/style.css
js/api.js, site-content.js, cart.js, wishlist.js, layout.js, product-card.js,
   home.js, shop.js, product-detail.js, cart-page.js,
   checkout.js, track-order.js, wishlist-page.js
images/ (product photos + logo.png)
admin/
  login.html, index.html, products.html, orders.html, settings.html,
  categories.html, coupons.html, content.html
  css/admin.css
  js/admin-auth.js, admin-layout.js, dashboard.js,
     products-admin.js, orders-admin.js, settings-admin.js,
     categories-admin.js, coupons-admin.js, content-admin.js
```

## 🚀 cPanel / MySQL Deployment

This project now includes a small PHP/MySQL backend for cPanel hosting. The frontend still calls the same `tables/{table}` API paths through `js/api.js`; `.htaccess` rewrites those requests to `api/tables.php`.

1. In cPanel, create a MySQL database and database user, then assign the user to the database.
2. Open phpMyAdmin, select that database, and import `database/demo_hair_store.sql`.
3. Edit `api/config.php` and replace `DB_NAME`, `DB_USER`, and `DB_PASS` with your cPanel database details.
4. Upload the full project to `public_html` or your chosen domain folder.

The demo SQL creates every table used by the current code: `products`, `orders`, `settings`, `categories`, `coupons`, `site_content`, `product_media`, `media_chunks`, `product_variations`, `order_tracking_notes`, and `size_test_rt`.

Default demo admin login: **username `admin`, password `admin123`**. Change it in `admin/settings.html` after first login.

## 🐛 Fixed: Admin Login Failure (relative-path fetch bug)

Previously, admin login always failed because `js/api.js` used a plain relative fetch path (`tables/...`) — correct from the site root, but resolving to the wrong URL (`/admin/tables/...`) when called from any page under `/admin/`. Fixed by anchoring every API call to the absolute URL `js/api.js` itself was loaded from (via `document.currentScript.src`), so it now resolves correctly regardless of page depth or any URL prefix the hosting environment adds.
