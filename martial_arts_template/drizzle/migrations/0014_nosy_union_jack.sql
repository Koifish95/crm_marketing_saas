CREATE TABLE `campaign_collaborators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_collaborators_pair_unique` ON `campaign_collaborators` (`campaign_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `campaign_collaborators_campaign_id_idx` ON `campaign_collaborators` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `campaign_programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`program_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_programs_pair_unique` ON `campaign_programs` (`campaign_id`,`program_id`);--> statement-breakpoint
CREATE INDEX `campaign_programs_campaign_id_idx` ON `campaign_programs` (`campaign_id`);--> statement-breakpoint
ALTER TABLE `campaign_tracking_links` ADD `destination_path` text DEFAULT '/trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
UPDATE `campaigns` SET `status` = CASE WHEN `active` = 1 THEN 'ACTIVE' ELSE 'COMPLETED' END;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `description` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `objective` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `offer` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `target_audience` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `owner_user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `campaigns` ADD `actual_starts_at` integer;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `actual_ends_at` integer;--> statement-breakpoint
CREATE INDEX `campaigns_owner_user_id_idx` ON `campaigns` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `campaigns` (`status`);