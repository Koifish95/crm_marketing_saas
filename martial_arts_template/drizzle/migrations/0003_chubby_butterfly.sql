CREATE TABLE `intro_availability_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_key` text NOT NULL,
	`program_id` integer NOT NULL,
	`weekday` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer,
	`name` text NOT NULL,
	`age_min` integer,
	`age_max` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intro_availability_rules_seed_key_unique` ON `intro_availability_rules` (`seed_key`);--> statement-breakpoint
CREATE INDEX `intro_availability_rules_program_id_idx` ON `intro_availability_rules` (`program_id`);--> statement-breakpoint
CREATE INDEX `intro_availability_rules_weekday_idx` ON `intro_availability_rules` (`weekday`);--> statement-breakpoint
CREATE TABLE `intro_exceptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`on_date` text NOT NULL,
	`kind` text NOT NULL,
	`rule_id` integer,
	`program_id` integer,
	`name` text,
	`start_minute` integer,
	`end_minute` integer,
	`age_min` integer,
	`age_max` integer,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `intro_availability_rules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intro_exceptions_on_date_idx` ON `intro_exceptions` (`on_date`);--> statement-breakpoint
CREATE INDEX `intro_exceptions_rule_id_idx` ON `intro_exceptions` (`rule_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
UPDATE `users` SET `username` = CASE
  WHEN lower(`email`) = 'admin@local' THEN 'admin'
  WHEN instr(`email`, '@') > 1 THEN lower(substr(`email`, 1, instr(`email`, '@') - 1))
  ELSE lower(`email`)
END
WHERE `username` IS NULL OR `username` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);