CREATE TABLE `security_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	`actor_user_id` integer,
	`target_user_id` integer,
	`ip` text,
	`user_agent` text,
	`metadata` text,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `security_events_created_at_idx` ON `security_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `security_events_action_idx` ON `security_events` (`action`);--> statement-breakpoint
CREATE INDEX `security_events_actor_user_id_idx` ON `security_events` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `security_events_target_user_id_idx` ON `security_events` (`target_user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `session_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` integer;