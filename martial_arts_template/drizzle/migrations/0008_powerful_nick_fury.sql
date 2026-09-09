CREATE TABLE `conversions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_line_id` integer NOT NULL,
	`lead_id` integer NOT NULL,
	`program_id` integer NOT NULL,
	`membership_offering_id` integer,
	`offering_name` text,
	`joined_at` integer NOT NULL,
	`monthly_cents` integer NOT NULL,
	`enrollment_cents` integer DEFAULT 0 NOT NULL,
	`discount_reason` text,
	`overridden` integer DEFAULT false NOT NULL,
	`note` text,
	`converted_by_user_id` integer,
	`reversed_at` integer,
	`reversed_by_user_id` integer,
	`reverse_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`membership_offering_id`) REFERENCES `membership_offerings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reversed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `conversions_lead_line_id_idx` ON `conversions` (`lead_line_id`);--> statement-breakpoint
CREATE INDEX `conversions_lead_id_idx` ON `conversions` (`lead_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversions_active_lead_line_unique` ON `conversions` (`lead_line_id`) WHERE "conversions"."reversed_at" is null;--> statement-breakpoint
CREATE TABLE `lead_line_lost_outcomes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_line_id` integer NOT NULL,
	`lead_id` integer NOT NULL,
	`lost_reason_id` integer NOT NULL,
	`note` text,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	`reopened_at` integer,
	`reopened_by_user_id` integer,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lost_reason_id`) REFERENCES `lost_reasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reopened_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_line_lost_outcomes_lead_line_id_idx` ON `lead_line_lost_outcomes` (`lead_line_id`);--> statement-breakpoint
CREATE INDEX `lead_line_lost_outcomes_lead_id_idx` ON `lead_line_lost_outcomes` (`lead_id`);