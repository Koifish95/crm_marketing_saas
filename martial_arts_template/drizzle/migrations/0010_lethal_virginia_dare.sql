CREATE TABLE `meta_ad_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`name` text,
	`currency` text,
	`timezone_name` text,
	`account_status` integer,
	`raw_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_ad_accounts_external_id_unique` ON `meta_ad_accounts` (`external_id`);--> statement-breakpoint
CREATE TABLE `meta_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ad_account_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text,
	`effective_status` text,
	`objective` text,
	`raw_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`ad_account_id`) REFERENCES `meta_ad_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_campaigns_external_id_unique` ON `meta_campaigns` (`external_id`);--> statement-breakpoint
CREATE INDEX `meta_campaigns_ad_account_id_idx` ON `meta_campaigns` (`ad_account_id`);--> statement-breakpoint
CREATE TABLE `meta_ad_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meta_campaign_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text,
	`effective_status` text,
	`raw_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`meta_campaign_id`) REFERENCES `meta_campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_ad_sets_external_id_unique` ON `meta_ad_sets` (`external_id`);--> statement-breakpoint
CREATE INDEX `meta_ad_sets_meta_campaign_id_idx` ON `meta_ad_sets` (`meta_campaign_id`);--> statement-breakpoint
CREATE TABLE `meta_ads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meta_ad_set_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text,
	`effective_status` text,
	`raw_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`meta_ad_set_id`) REFERENCES `meta_ad_sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_ads_external_id_unique` ON `meta_ads` (`external_id`);--> statement-breakpoint
CREATE INDEX `meta_ads_meta_ad_set_id_idx` ON `meta_ads` (`meta_ad_set_id`);--> statement-breakpoint
CREATE TABLE `meta_daily_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_external_id` text NOT NULL,
	`metric_date` text NOT NULL,
	`spend_cents` integer DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`reach` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`ctr` text,
	`cpc` text,
	`cpm` text,
	`leads_count` integer DEFAULT 0 NOT NULL,
	`fetched_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meta_daily_metrics_entity_date_unique` ON `meta_daily_metrics` (`entity_type`,`entity_external_id`,`metric_date`);--> statement-breakpoint
CREATE INDEX `meta_daily_metrics_entity_idx` ON `meta_daily_metrics` (`entity_type`,`entity_external_id`);--> statement-breakpoint
CREATE TABLE `meta_sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text DEFAULT 'META' NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`records_fetched` integer DEFAULT 0 NOT NULL,
	`records_inserted` integer DEFAULT 0 NOT NULL,
	`records_updated` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`triggered_by_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaign_meta_maps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`meta_campaign_id` integer NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`meta_campaign_id`) REFERENCES `meta_campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_meta_maps_pair_unique` ON `campaign_meta_maps` (`campaign_id`,`meta_campaign_id`);--> statement-breakpoint
CREATE INDEX `campaign_meta_maps_campaign_id_idx` ON `campaign_meta_maps` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `campaign_meta_maps_meta_campaign_id_idx` ON `campaign_meta_maps` (`meta_campaign_id`);
