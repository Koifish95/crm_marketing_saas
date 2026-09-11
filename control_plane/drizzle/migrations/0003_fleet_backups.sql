CREATE TABLE `environment_backups` (
	`id` text PRIMARY KEY NOT NULL,
	`environment_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`created_at` text NOT NULL,
	`bytes` integer NOT NULL,
	`zip_path` text NOT NULL,
	`sqlite_filename` text NOT NULL,
	`offhost_path` text,
	`offhost_copied_at` text,
	`previous_expected_image` text,
	FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `environment_backups_environment_id_idx` ON `environment_backups` (`environment_id`);
