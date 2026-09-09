CREATE TABLE `lead_possible_duplicates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`matched_lead_id` integer NOT NULL,
	`match_kind` text NOT NULL,
	`matched_display_name` text NOT NULL,
	`detected_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`matched_lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_possible_duplicates_lead_id_idx` ON `lead_possible_duplicates` (`lead_id`);--> statement-breakpoint
CREATE INDEX `lead_possible_duplicates_matched_lead_id_idx` ON `lead_possible_duplicates` (`matched_lead_id`);--> statement-breakpoint
CREATE TABLE `public_booking_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`idempotency_key` text NOT NULL,
	`lead_id` integer,
	`result_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_booking_submissions_key_unique` ON `public_booking_submissions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `public_booking_submissions_lead_id_idx` ON `public_booking_submissions` (`lead_id`);