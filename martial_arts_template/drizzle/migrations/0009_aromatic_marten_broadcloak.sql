CREATE TABLE `campaign_tracking_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`utm_content` text,
	`utm_term` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_tracking_links_code_unique` ON `campaign_tracking_links` (`code`);--> statement-breakpoint
CREATE INDEX `campaign_tracking_links_campaign_id_idx` ON `campaign_tracking_links` (`campaign_id`);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `kind` text DEFAULT 'ORGANIC' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `budget_cents` integer;--> statement-breakpoint
ALTER TABLE `leads` ADD `campaign_tracking_link_id` integer REFERENCES campaign_tracking_links(id);--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_source` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_medium` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_content` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_term` text;