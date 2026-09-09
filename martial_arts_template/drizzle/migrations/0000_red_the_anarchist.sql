CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`seasonal` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programs_code_unique` ON `programs` (`code`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`channel` text,
	`active` integer DEFAULT true NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_unique` ON `campaigns` (`slug`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`phone` text,
	`email` text,
	`program_id` integer NOT NULL,
	`experience_level` text DEFAULT 'UNKNOWN' NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`participant_first_name` text,
	`participant_last_name` text,
	`participant_age` integer,
	`guardian_relationship` text,
	`campaign_id` integer,
	`joined_at` integer,
	`monthly_rate_cents` integer,
	`sms_consent` integer DEFAULT false NOT NULL,
	`sms_consent_at` integer,
	`email_consent` integer DEFAULT false NOT NULL,
	`email_consent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leads_phone_idx` ON `leads` (`phone`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_program_id_idx` ON `leads` (`program_id`);--> statement-breakpoint
CREATE INDEX `leads_campaign_id_idx` ON `leads` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `lead_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`changed_by_user_id` integer,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_status_history_lead_id_idx` ON `lead_status_history` (`lead_id`);--> statement-breakpoint
CREATE TABLE `lead_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_notes_lead_id_idx` ON `lead_notes` (`lead_id`);--> statement-breakpoint
CREATE TABLE `trials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`scheduled_at` integer NOT NULL,
	`label` text,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trials_lead_id_idx` ON `trials` (`lead_id`);--> statement-breakpoint
CREATE INDEX `trials_scheduled_at_idx` ON `trials` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `follow_up_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_id` integer NOT NULL,
	`type` text DEFAULT 'PHONE_CALL' NOT NULL,
	`due_at` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`assigned_user_id` integer,
	`completed_at` integer,
	`outcome` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `follow_up_tasks_lead_id_idx` ON `follow_up_tasks` (`lead_id`);--> statement-breakpoint
CREATE INDEX `follow_up_tasks_due_at_idx` ON `follow_up_tasks` (`due_at`);--> statement-breakpoint
CREATE INDEX `follow_up_tasks_status_idx` ON `follow_up_tasks` (`status`);
