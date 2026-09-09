ALTER TABLE `campaign_tracking_links` ADD `public_slug` text;--> statement-breakpoint
UPDATE `campaign_tracking_links`
SET `public_slug` = (
  SELECT `slug` FROM `campaigns` WHERE `campaigns`.`id` = `campaign_tracking_links`.`campaign_id`
)
WHERE `is_default` = 1 AND (`public_slug` IS NULL OR `public_slug` = '');--> statement-breakpoint
UPDATE `campaign_tracking_links`
SET `public_slug` = (
  SELECT `slug` FROM `campaigns` WHERE `campaigns`.`id` = `campaign_tracking_links`.`campaign_id`
) || '-' || CAST(`id` AS TEXT)
WHERE (`is_default` = 0 OR `is_default` IS NULL) AND (`public_slug` IS NULL OR `public_slug` = '');--> statement-breakpoint
UPDATE `campaign_tracking_links`
SET `public_slug` = 'link-' || CAST(`id` AS TEXT)
WHERE `public_slug` IS NULL OR `public_slug` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_tracking_links_public_slug_unique` ON `campaign_tracking_links` (`public_slug`);
