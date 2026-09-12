CREATE TABLE `sales_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`budget_cents` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sales_campaigns_status_idx` ON `sales_campaigns` (`status`);--> statement-breakpoint
CREATE TABLE `sales_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`pricing_type` text NOT NULL,
	`default_unit_price_cents` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sales_offers_active_idx` ON `sales_offers` (`active`);--> statement-breakpoint
CREATE TABLE `sales_opportunity_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`opportunity_id` integer NOT NULL,
	`offer_id` integer,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`pricing_type` text NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `sales_opportunities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offer_id`) REFERENCES `sales_offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_opportunity_lines_opportunity_id_idx` ON `sales_opportunity_lines` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `sales_public_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`idempotency_key` text NOT NULL,
	`lead_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `sales_leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_public_submissions_key_unique` ON `sales_public_submissions` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `sales_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_sources_code_unique` ON `sales_sources` (`code`);--> statement-breakpoint
CREATE TABLE `sales_tracking_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`source_id` integer NOT NULL,
	`label` text NOT NULL,
	`token` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`click_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `sales_campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sales_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_tracking_links_token_unique` ON `sales_tracking_links` (`token`);--> statement-breakpoint
CREATE INDEX `sales_tracking_links_campaign_id_idx` ON `sales_tracking_links` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `sales_tracking_links_source_id_idx` ON `sales_tracking_links` (`source_id`);--> statement-breakpoint
ALTER TABLE `sales_accounts` ADD `lifecycle` text DEFAULT 'prospect' NOT NULL;--> statement-breakpoint
CREATE INDEX `sales_accounts_lifecycle_idx` ON `sales_accounts` (`lifecycle`);--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `source_id` integer REFERENCES sales_sources(id);--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `campaign_id` integer REFERENCES sales_campaigns(id);--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `source_detail` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `source_name` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `campaign_name` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_source_id` integer REFERENCES sales_sources(id);--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_campaign_id` integer REFERENCES sales_campaigns(id);--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_tracking_link_id` integer REFERENCES sales_tracking_links(id);--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_at` integer;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_source_name` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_campaign_name` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `captured_tracking_link_label` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `intake_company_name` text;--> statement-breakpoint
ALTER TABLE `sales_leads` ADD `possible_duplicate_lead_id` integer;--> statement-breakpoint
CREATE INDEX `sales_leads_source_id_idx` ON `sales_leads` (`source_id`);--> statement-breakpoint
CREATE INDEX `sales_leads_campaign_id_idx` ON `sales_leads` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `sales_leads_captured_tracking_link_id_idx` ON `sales_leads` (`captured_tracking_link_id`);--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `mrr_cents` integer;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `won_at` integer;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `lost_at` integer;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `source_id` integer REFERENCES sales_sources(id);--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `campaign_id` integer REFERENCES sales_campaigns(id);--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `source_detail` text;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `source_name` text;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `campaign_name` text;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_source_id` integer REFERENCES sales_sources(id);--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_campaign_id` integer REFERENCES sales_campaigns(id);--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_tracking_link_id` integer REFERENCES sales_tracking_links(id);--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_at` integer;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_source_name` text;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_campaign_name` text;--> statement-breakpoint
ALTER TABLE `sales_opportunities` ADD `captured_tracking_link_label` text;--> statement-breakpoint
CREATE INDEX `sales_opportunities_source_id_idx` ON `sales_opportunities` (`source_id`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_campaign_id_idx` ON `sales_opportunities` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_won_at_idx` ON `sales_opportunities` (`won_at`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_lost_at_idx` ON `sales_opportunities` (`lost_at`);--> statement-breakpoint
INSERT OR IGNORE INTO `sales_sources` (`code`, `name`, `active`, `created_at`, `updated_at`) VALUES
	('referral', 'Referral', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('website_organic', 'Website / Organic', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('facebook', 'Facebook', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('instagram', 'Instagram', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('google', 'Google', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('email', 'Email', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('cold_outreach', 'Cold Outreach', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('networking_event', 'Networking / Event', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('existing_customer', 'Existing Customer', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('partner', 'Partner', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)),
	('other', 'Other', 1, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000));--> statement-breakpoint
INSERT INTO `sales_opportunity_lines` (`opportunity_id`, `offer_id`, `description`, `quantity`, `pricing_type`, `unit_price_cents`, `created_at`, `updated_at`)
SELECT `id`, NULL, `name`, 1, 'one_time', `amount_cents`, `created_at`, `updated_at`
FROM `sales_opportunities`
WHERE `amount_cents` IS NOT NULL
	AND `amount_cents` > 0
	AND `id` NOT IN (SELECT `opportunity_id` FROM `sales_opportunity_lines`);--> statement-breakpoint
UPDATE `sales_opportunities` SET `mrr_cents` = 0 WHERE `mrr_cents` IS NULL;--> statement-breakpoint
UPDATE `sales_accounts` SET `lifecycle` = 'customer'
WHERE `id` IN (SELECT `account_id` FROM `sales_opportunities` WHERE `stage` = 'won');