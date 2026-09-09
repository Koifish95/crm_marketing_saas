CREATE TABLE `household_pricing_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`first_monthly_cents` integer NOT NULL,
	`additional_monthly_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_pricing_rules_program_id_unique` ON `household_pricing_rules` (`program_id`);--> statement-breakpoint
CREATE TABLE `lead_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_sources_code_unique` ON `lead_sources` (`code`);--> statement-breakpoint
CREATE TABLE `lost_reasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lost_reasons_code_unique` ON `lost_reasons` (`code`);--> statement-breakpoint
CREATE TABLE `membership_offerings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`program_id` integer NOT NULL,
	`monthly_cents` integer NOT NULL,
	`enrollment_cents` integer DEFAULT 0 NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `membership_offerings_program_id_idx` ON `membership_offerings` (`program_id`);--> statement-breakpoint
ALTER TABLE `lead_lines` ADD `membership_offering_id` integer REFERENCES membership_offerings(id);--> statement-breakpoint
ALTER TABLE `lead_lines` ADD `monthly_override_cents` integer;--> statement-breakpoint
ALTER TABLE `lead_lines` ADD `discount_reason` text;