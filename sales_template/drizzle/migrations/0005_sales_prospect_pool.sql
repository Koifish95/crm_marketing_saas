ALTER TABLE `sales_accounts` ADD `do_not_contact` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `sales_prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`domain_key` text,
	`city` text,
	`state` text,
	`discipline` text,
	`email` text,
	`phone` text,
	`phone_key` text,
	`location_key` text,
	`status` text DEFAULT 'review' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`lane` text DEFAULT 'national' NOT NULL,
	`possible_duplicate_prospect_id` integer,
	`sales_account_id` integer,
	`sales_contact_id` integer,
	`sales_opportunity_id` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`sales_account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sales_contact_id`) REFERENCES `sales_contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sales_opportunity_id`) REFERENCES `sales_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_prospects_domain_key_unique` ON `sales_prospects` (`domain_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_prospects_location_key_unique` ON `sales_prospects` (`location_key`);
--> statement-breakpoint
CREATE INDEX `sales_prospects_status_idx` ON `sales_prospects` (`status`);
--> statement-breakpoint
CREATE INDEX `sales_prospects_state_idx` ON `sales_prospects` (`state`);
--> statement-breakpoint
CREATE INDEX `sales_prospects_phone_key_idx` ON `sales_prospects` (`phone_key`);
--> statement-breakpoint
CREATE INDEX `sales_prospects_sales_account_id_idx` ON `sales_prospects` (`sales_account_id`);
--> statement-breakpoint
CREATE TABLE `sales_prospect_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`query` text,
	`source_url` text,
	`raw_ref` text,
	`discovered_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `sales_prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_prospect_observations_source_external_unique` ON `sales_prospect_observations` (`source`, `external_id`);
--> statement-breakpoint
CREATE INDEX `sales_prospect_observations_prospect_id_idx` ON `sales_prospect_observations` (`prospect_id`);
