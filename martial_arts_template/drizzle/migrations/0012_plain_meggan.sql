CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` integer,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`key`, `value`, `updated_at`, `updated_by_user_id`)
VALUES ('allowEarlyTrialOutcomes', 'true', 1788386509142, NULL);
