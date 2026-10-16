CREATE TABLE `acquisition_funnel_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journey_id` text NOT NULL,
	`event_type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`campaign_id` integer,
	`campaign_tracking_link_id` integer,
	`tracking_code` text,
	`utm_source` text,
	`utm_medium` text,
	`utm_content` text,
	`utm_term` text,
	`route` text,
	`device_class` text,
	`metadata` text,
	`lead_id` integer,
	`dedupe_key` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_tracking_link_id`) REFERENCES `campaign_tracking_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acquisition_funnel_events_dedupe_unique` ON `acquisition_funnel_events` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `acquisition_funnel_events_journey_idx` ON `acquisition_funnel_events` (`journey_id`);--> statement-breakpoint
CREATE INDEX `acquisition_funnel_events_campaign_occurred_idx` ON `acquisition_funnel_events` (`campaign_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `acquisition_funnel_events_type_occurred_idx` ON `acquisition_funnel_events` (`event_type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `acquisition_funnel_events_lead_id_idx` ON `acquisition_funnel_events` (`lead_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`, `value`, `updated_at`, `updated_by_user_id`)
VALUES (
	'acquisition_funnel_activated_at',
	CAST(CAST(strftime('%s','now') AS INTEGER) * 1000 AS TEXT),
	CAST(strftime('%s','now') AS INTEGER) * 1000,
	NULL
);