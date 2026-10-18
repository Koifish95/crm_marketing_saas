ALTER TABLE `sales_prospects` ADD `email_evidence` text;
--> statement-breakpoint
ALTER TABLE `sales_prospects` ADD `rejection_reason` text;
--> statement-breakpoint
CREATE TABLE `sales_prospect_lookups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`homepage_url` text NOT NULL,
	`result` text NOT NULL,
	`email` text,
	`email_evidence` text,
	`email_source_url` text,
	`phone` text,
	`looked_up_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_prospect_lookups_homepage_url_unique` ON `sales_prospect_lookups` (`homepage_url`);
