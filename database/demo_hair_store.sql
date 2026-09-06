-- cPanel/phpMyAdmin import:
-- Create a database in cPanel first, open it in phpMyAdmin, then import this file.

DROP TABLE IF EXISTS `order_tracking_notes`;
DROP TABLE IF EXISTS `media_chunks`;
DROP TABLE IF EXISTS `product_variations`;
DROP TABLE IF EXISTS `product_media`;
DROP TABLE IF EXISTS `size_test_rt`;
DROP TABLE IF EXISTS `site_content`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `products`;

CREATE TABLE `products` (
  `id` varchar(80) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` mediumtext,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `compare_at_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `category` varchar(160) DEFAULT '',
  `image_url` mediumtext,
  `gallery` mediumtext,
  `stock_quantity` int NOT NULL DEFAULT 0,
  `product_type` varchar(30) NOT NULL DEFAULT 'in_stock',
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `sku` varchar(120) DEFAULT '',
  `release_date` varchar(40) DEFAULT '',
  `deposit_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `orders` (
  `id` varchar(80) NOT NULL,
  `order_number` varchar(80) NOT NULL,
  `customer_name` varchar(255) DEFAULT '',
  `customer_email` varchar(255) DEFAULT '',
  `customer_phone` varchar(80) DEFAULT '',
  `shipping_address` mediumtext,
  `items` mediumtext,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `order_type` varchar(30) DEFAULT 'in_stock',
  `payment_status` varchar(40) DEFAULT 'pending',
  `fulfillment_status` varchar(40) DEFAULT 'pending',
  `notes` mediumtext,
  `payment_method` varchar(40) DEFAULT '',
  `paystack_reference` varchar(160) DEFAULT '',
  `offline_receipt_url` mediumtext,
  PRIMARY KEY (`id`),
  KEY `order_number` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `settings` (
  `id` varchar(80) NOT NULL,
  `store_name` varchar(255) DEFAULT 'Amah Wigs',
  `admin_username` varchar(120) DEFAULT 'admin',
  `admin_password` varchar(120) DEFAULT 'admin123',
  `currency_symbol` varchar(20) DEFAULT 'NGN ',
  `paystack_public_key` varchar(255) DEFAULT '',
  `paystack_secret_key` varchar(255) DEFAULT '',
  `paystack_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `paystack_currency` varchar(10) DEFAULT 'NGN',
  `offline_payment_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `offline_bank_name` varchar(160) DEFAULT 'Demo Bank',
  `offline_account_name` varchar(160) DEFAULT 'Amah Wigs',
  `offline_account_number` varchar(80) DEFAULT '0000000000',
  `offline_instructions` mediumtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `icon` varchar(120) DEFAULT '',
  `image_url` mediumtext,
  `sort_order` int NOT NULL DEFAULT 0,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `coupons` (
  `id` varchar(80) NOT NULL,
  `code` varchar(80) NOT NULL,
  `discount_type` varchar(30) NOT NULL DEFAULT 'percent',
  `discount_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `min_order` decimal(12,2) NOT NULL DEFAULT 0.00,
  `max_uses` int NOT NULL DEFAULT 0,
  `used_count` int NOT NULL DEFAULT 0,
  `expires_at` varchar(40) DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `site_content` (
  `id` varchar(80) NOT NULL,
  `primary_color` varchar(20) DEFAULT '#0f172a',
  `accent_color` varchar(20) DEFAULT '#b45309',
  `dark_color` varchar(20) DEFAULT '#111827',
  `success_color` varchar(20) DEFAULT '#16a34a',
  `danger_color` varchar(20) DEFAULT '#dc2626',
  `announcement_text` varchar(255) DEFAULT '',
  `hero_badge_text` varchar(120) DEFAULT '',
  `hero_heading` varchar(255) DEFAULT '',
  `hero_subheading` mediumtext,
  `hero_image_url` mediumtext,
  `hero_cta_primary_text` varchar(120) DEFAULT '',
  `hero_cta_primary_link` varchar(255) DEFAULT '',
  `hero_cta_secondary_text` varchar(120) DEFAULT '',
  `hero_cta_secondary_link` varchar(255) DEFAULT '',
  `trust_badge_1_icon` varchar(120) DEFAULT '',
  `trust_badge_1_title` varchar(120) DEFAULT '',
  `trust_badge_1_subtitle` varchar(160) DEFAULT '',
  `trust_badge_2_icon` varchar(120) DEFAULT '',
  `trust_badge_2_title` varchar(120) DEFAULT '',
  `trust_badge_2_subtitle` varchar(160) DEFAULT '',
  `trust_badge_3_icon` varchar(120) DEFAULT '',
  `trust_badge_3_title` varchar(120) DEFAULT '',
  `trust_badge_3_subtitle` varchar(160) DEFAULT '',
  `featured_section_heading` varchar(160) DEFAULT '',
  `preorder_section_heading` varchar(160) DEFAULT '',
  `preorder_section_subtext` mediumtext,
  `categories_section_heading` varchar(160) DEFAULT '',
  `footer_about_text` mediumtext,
  `contact_email` varchar(255) DEFAULT '',
  `contact_phone` varchar(80) DEFAULT '',
  `contact_address` mediumtext,
  `whatsapp_number` varchar(80) DEFAULT '',
  `social_instagram` varchar(255) DEFAULT '',
  `social_facebook` varchar(255) DEFAULT '',
  `social_tiktok` varchar(255) DEFAULT '',
  `social_twitter` varchar(255) DEFAULT '',
  `free_shipping_threshold` decimal(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_media` (
  `id` varchar(80) NOT NULL,
  `product_id` varchar(80) NOT NULL,
  `media_type` varchar(30) NOT NULL DEFAULT 'image',
  `url` mediumtext,
  `is_chunked` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `media_chunks` (
  `id` varchar(80) NOT NULL,
  `media_id` varchar(80) NOT NULL,
  `chunk_index` int NOT NULL DEFAULT 0,
  `chunk_data` mediumtext,
  PRIMARY KEY (`id`),
  KEY `media_id` (`media_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_variations` (
  `id` varchar(80) NOT NULL,
  `product_id` varchar(80) NOT NULL,
  `group_name` varchar(120) NOT NULL,
  `group_values` mediumtext,
  `sort_order` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_tracking_notes` (
  `id` varchar(80) NOT NULL,
  `order_id` varchar(80) NOT NULL,
  `message` text,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `size_test_rt` (
  `id` varchar(80) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`id`, `store_name`, `admin_username`, `admin_password`, `currency_symbol`, `paystack_enabled`, `paystack_currency`, `offline_payment_enabled`, `offline_bank_name`, `offline_account_name`, `offline_account_number`, `offline_instructions`) VALUES
('store_settings', 'Amah Wigs', 'admin', 'admin123', 'NGN ', 0, 'NGN', 1, 'Demo Bank', 'Amah Wigs', '0000000000', 'Use your order number as the transfer reference, then upload your receipt at checkout.');

INSERT INTO `site_content` (`id`, `announcement_text`, `hero_badge_text`, `hero_heading`, `hero_subheading`, `hero_image_url`, `hero_cta_primary_text`, `hero_cta_primary_link`, `hero_cta_secondary_text`, `hero_cta_secondary_link`, `featured_section_heading`, `preorder_section_heading`, `preorder_section_subtext`, `categories_section_heading`, `footer_about_text`, `contact_email`, `contact_phone`, `whatsapp_number`, `free_shipping_threshold`) VALUES
('site_content', 'Free delivery on orders over NGN 150000 | New wig drops every week', 'Ready-to-wear hair essentials', 'Amah Wigs', 'Shop lace wigs, bundles, care products, and styling tools for polished everyday installs.', 'https://placehold.co/1200x850/e9d5c0/111111?text=Amah+Wigs', 'Shop Hair', 'shop.html', 'View Pre-Orders', 'shop.html?type=pre_order', 'Popular Hair Products', 'Pre-order Wigs', 'Reserve selected premium units with a deposit before they arrive.', 'Shop Categories', 'Quality wigs, bundles, hair care, and styling tools for everyday beauty.', 'hello@example.com', '+234 800 000 0000', '2348000000000', 150000.00);

INSERT INTO `categories` (`id`, `name`, `icon`, `image_url`, `sort_order`, `status`) VALUES
('cat_lace_front', 'Lace Front Wigs', 'fa-user', 'https://placehold.co/600x600/f3e8ff/111111?text=Lace+Front', 1, 'active'),
('cat_closure', 'Closure Wigs', 'fa-gem', 'https://placehold.co/600x600/fce7f3/111111?text=Closure+Wigs', 2, 'active'),
('cat_bundles', 'Hair Bundles', 'fa-layer-group', 'https://placehold.co/600x600/ecfccb/111111?text=Bundles', 3, 'active'),
('cat_care', 'Hair Care', 'fa-spray-can-sparkles', 'https://placehold.co/600x600/dbeafe/111111?text=Hair+Care', 4, 'active'),
('cat_tools', 'Styling Tools', 'fa-wand-magic-sparkles', 'https://placehold.co/600x600/fef3c7/111111?text=Styling+Tools', 5, 'active');

INSERT INTO `products` (`id`, `name`, `description`, `price`, `compare_at_price`, `category`, `image_url`, `gallery`, `stock_quantity`, `product_type`, `status`, `sku`, `release_date`, `deposit_percent`, `featured`) VALUES
('hair_001', '13x4 Body Wave Lace Front Wig', 'Soft body wave lace front wig with natural density and a beginner-friendly hairline.', 185000.00, 210000.00, 'Lace Front Wigs', 'https://placehold.co/900x1100/f3e8ff/111111?text=Body+Wave+Lace+Front', '[]', 8, 'in_stock', 'active', 'AW-LF-BW-001', '', 0.00, 1),
('hair_002', 'HD Straight Lace Front Wig', 'Sleek straight HD lace wig with a clean middle part and smooth finish.', 220000.00, 245000.00, 'Lace Front Wigs', 'https://placehold.co/900x1100/e0f2fe/111111?text=HD+Straight+Lace', '[]', 5, 'in_stock', 'active', 'AW-LF-ST-002', '', 0.00, 1),
('hair_003', '5x5 Kinky Straight Closure Wig', 'Full kinky straight closure wig for a natural textured look with easy maintenance.', 165000.00, 0.00, 'Closure Wigs', 'https://placehold.co/900x1100/fce7f3/111111?text=Kinky+Straight+Closure', '[]', 6, 'in_stock', 'active', 'AW-CW-KS-003', '', 0.00, 1),
('hair_004', 'Bob Closure Wig', 'Chic blunt-cut bob closure wig, pre-styled for everyday wear.', 145000.00, 160000.00, 'Closure Wigs', 'https://placehold.co/900x1100/fee2e2/111111?text=Bob+Closure+Wig', '[]', 7, 'in_stock', 'active', 'AW-CW-BOB-004', '', 0.00, 0),
('hair_005', 'Brazilian Body Wave Bundles', 'Three soft body wave bundles for sew-ins, ponytails, and wig making.', 95000.00, 110000.00, 'Hair Bundles', 'https://placehold.co/900x1100/ecfccb/111111?text=Body+Wave+Bundles', '[]', 12, 'in_stock', 'active', 'AW-HB-BW-005', '', 0.00, 1),
('hair_006', 'Raw Vietnamese Straight Bundles', 'Premium raw straight bundles with full ends and long-lasting shine.', 135000.00, 0.00, 'Hair Bundles', 'https://placehold.co/900x1100/dcfce7/111111?text=Vietnamese+Straight+Bundles', '[]', 4, 'in_stock', 'active', 'AW-HB-VS-006', '', 0.00, 0),
('hair_007', 'Argan Hair Serum', 'Lightweight shine serum for wigs, bundles, and leave-out styling.', 12500.00, 15000.00, 'Hair Care', 'https://placehold.co/900x1100/dbeafe/111111?text=Argan+Hair+Serum', '[]', 20, 'in_stock', 'active', 'AW-HC-SER-007', '', 0.00, 1),
('hair_008', 'Lace Melt Spray', 'Fast-drying lace melt spray for secure installs and clean edges.', 9500.00, 0.00, 'Hair Care', 'https://placehold.co/900x1100/e0e7ff/111111?text=Lace+Melt+Spray', '[]', 25, 'in_stock', 'active', 'AW-HC-LMS-008', '', 0.00, 0),
('hair_009', 'Professional Hot Comb', 'Electric hot comb for flattening roots, lace fronts, and closure installs.', 28000.00, 35000.00, 'Styling Tools', 'https://placehold.co/900x1100/fef3c7/111111?text=Professional+Hot+Comb', '[]', 10, 'in_stock', 'active', 'AW-ST-HC-009', '', 0.00, 0),
('hair_010', 'Pre-Order 613 Blonde Frontal Wig', 'Premium blonde frontal wig available for reservation before the next shipment.', 255000.00, 285000.00, 'Lace Front Wigs', 'https://placehold.co/900x1100/ffedd5/111111?text=613+Blonde+Pre-Order', '[]', 10, 'pre_order', 'active', 'AW-LF-613-010', '2026-10-20', 30.00, 1);

INSERT INTO `product_media` (`id`, `product_id`, `media_type`, `url`, `is_chunked`, `sort_order`) VALUES
('pm_hair_001', 'hair_001', 'image', 'https://placehold.co/900x1100/f3e8ff/111111?text=Body+Wave+Lace+Front', 0, 0),
('pm_hair_002', 'hair_002', 'image', 'https://placehold.co/900x1100/e0f2fe/111111?text=HD+Straight+Lace', 0, 0),
('pm_hair_003', 'hair_003', 'image', 'https://placehold.co/900x1100/fce7f3/111111?text=Kinky+Straight+Closure', 0, 0),
('pm_hair_004', 'hair_004', 'image', 'https://placehold.co/900x1100/fee2e2/111111?text=Bob+Closure+Wig', 0, 0),
('pm_hair_005', 'hair_005', 'image', 'https://placehold.co/900x1100/ecfccb/111111?text=Body+Wave+Bundles', 0, 0),
('pm_hair_006', 'hair_006', 'image', 'https://placehold.co/900x1100/dcfce7/111111?text=Vietnamese+Straight+Bundles', 0, 0),
('pm_hair_007', 'hair_007', 'image', 'https://placehold.co/900x1100/dbeafe/111111?text=Argan+Hair+Serum', 0, 0),
('pm_hair_008', 'hair_008', 'image', 'https://placehold.co/900x1100/e0e7ff/111111?text=Lace+Melt+Spray', 0, 0),
('pm_hair_009', 'hair_009', 'image', 'https://placehold.co/900x1100/fef3c7/111111?text=Professional+Hot+Comb', 0, 0),
('pm_hair_010', 'hair_010', 'image', 'https://placehold.co/900x1100/ffedd5/111111?text=613+Blonde+Pre-Order', 0, 0);

INSERT INTO `product_variations` (`id`, `product_id`, `group_name`, `group_values`, `sort_order`) VALUES
('pv_hair_001_length', 'hair_001', 'Length', '["16 inch","18 inch","20 inch"]', 0),
('pv_hair_002_length', 'hair_002', 'Length', '["18 inch","20 inch","22 inch"]', 0),
('pv_hair_003_length', 'hair_003', 'Length', '["14 inch","16 inch","18 inch"]', 0),
('pv_hair_004_length', 'hair_004', 'Length', '["10 inch","12 inch","14 inch"]', 0),
('pv_hair_005_length', 'hair_005', 'Length', '["18 inch","20 inch","22 inch"]', 0),
('pv_hair_006_length', 'hair_006', 'Length', '["20 inch","22 inch","24 inch"]', 0),
('pv_hair_010_length', 'hair_010', 'Length', '["20 inch","22 inch","24 inch"]', 0);

INSERT INTO `coupons` (`id`, `code`, `discount_type`, `discount_value`, `min_order`, `max_uses`, `used_count`, `expires_at`, `active`) VALUES
('coupon_welcome10', 'WELCOME10', 'percent', 10.00, 50000.00, 100, 0, '', 1);
