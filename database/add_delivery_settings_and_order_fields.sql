ALTER TABLE `settings`
  ADD COLUMN `delivery_config` mediumtext AFTER `offline_instructions`;

ALTER TABLE `orders`
  ADD COLUMN `delivery_option` varchar(160) DEFAULT '' AFTER `subtotal`,
  ADD COLUMN `delivery_weight_band` varchar(80) DEFAULT '' AFTER `delivery_option`,
  ADD COLUMN `delivery_doorstep` tinyint(1) NOT NULL DEFAULT 0 AFTER `delivery_weight_band`,
  ADD COLUMN `delivery_cost` decimal(12,2) NOT NULL DEFAULT 0.00 AFTER `delivery_doorstep`;

UPDATE `settings`
SET `delivery_config` = '{"doorstep_fee":6000,"zones":[{"key":"pickup","label":"Pickup","fees":{"1_2":0,"2_4":0,"4_plus":0}},{"key":"lagos_south_east","label":"Lagos and South East states","fees":{"1_2":6000,"2_4":9000,"4_plus":13000}},{"key":"abuja","label":"Abuja","fees":{"1_2":10000,"2_4":14000,"4_plus":13000}},{"key":"other_northern","label":"Other Northern States","fees":{"1_2":9000,"2_4":15000,"4_plus":19000}}]}'
WHERE `id` = 'store_settings'
  AND (`delivery_config` IS NULL OR `delivery_config` = '');

UPDATE `site_content`
SET `contact_phone` = '+2349013400051',
    `whatsapp_number` = '2349013400051'
WHERE `id` = 'site_content';

