CREATE TABLE `lead_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`relationship` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`date_of_birth` integer,
	`age` integer,
	`program_id` integer NOT NULL,
	`experience_level` text DEFAULT 'UNKNOWN' NOT NULL,
	`notes` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_lines_lead_id_idx` ON `lead_lines` (`lead_id`);--> statement-breakpoint
CREATE INDEX `lead_lines_status_idx` ON `lead_lines` (`status`);--> statement-breakpoint
CREATE INDEX `lead_lines_program_id_idx` ON `lead_lines` (`program_id`);--> statement-breakpoint
CREATE TABLE `lead_line_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_line_id` integer NOT NULL,
	`lead_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by_user_id` integer,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_line_status_history_lead_line_id_idx` ON `lead_line_status_history` (`lead_line_id`);--> statement-breakpoint
CREATE INDEX `lead_line_status_history_lead_id_idx` ON `lead_line_status_history` (`lead_id`);--> statement-breakpoint
CREATE TABLE `follow_up_task_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`lead_line_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `follow_up_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follow_up_task_lines_task_line_unique` ON `follow_up_task_lines` (`task_id`,`lead_line_id`);--> statement-breakpoint
CREATE INDEX `follow_up_task_lines_task_id_idx` ON `follow_up_task_lines` (`task_id`);--> statement-breakpoint
CREATE INDEX `follow_up_task_lines_lead_line_id_idx` ON `follow_up_task_lines` (`lead_line_id`);--> statement-breakpoint
ALTER TABLE `leads` ADD `closed_at` integer;--> statement-breakpoint
ALTER TABLE `trials` ADD `lead_line_id` integer REFERENCES lead_lines(id);--> statement-breakpoint
CREATE INDEX `trials_lead_line_id_idx` ON `trials` (`lead_line_id`);--> statement-breakpoint
INSERT INTO `lead_lines` (
	`lead_id`,
	`relationship`,
	`first_name`,
	`last_name`,
	`age`,
	`program_id`,
	`experience_level`,
	`status`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	CASE
		WHEN `participant_first_name` IS NOT NULL AND trim(`participant_first_name`) != '' THEN 'CHILD'
		ELSE 'SELF'
	END,
	CASE
		WHEN `participant_first_name` IS NOT NULL AND trim(`participant_first_name`) != '' THEN `participant_first_name`
		ELSE `first_name`
	END,
	CASE
		WHEN `participant_first_name` IS NOT NULL AND trim(`participant_first_name`) != '' THEN `participant_last_name`
		ELSE `last_name`
	END,
	CASE
		WHEN `participant_first_name` IS NOT NULL AND trim(`participant_first_name`) != '' THEN `participant_age`
		ELSE NULL
	END,
	`program_id`,
	`experience_level`,
	`status`,
	`created_at`,
	`updated_at`
FROM `leads`;--> statement-breakpoint
UPDATE `trials`
SET `lead_line_id` = (
	SELECT `id` FROM `lead_lines` WHERE `lead_lines`.`lead_id` = `trials`.`lead_id` LIMIT 1
)
WHERE `lead_line_id` IS NULL;--> statement-breakpoint
INSERT INTO `lead_line_status_history` (
	`lead_line_id`,
	`lead_id`,
	`from_status`,
	`to_status`,
	`note`,
	`created_at`
)
SELECT
	`id`,
	`lead_id`,
	NULL,
	`status`,
	'Backfilled from household migration.',
	`created_at`
FROM `lead_lines`;
