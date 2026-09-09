PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_leads` (
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
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "leads_phone_or_email_check" CHECK((phone IS NOT NULL AND phone != '') OR (email IS NOT NULL AND email != ''))
);
--> statement-breakpoint
INSERT INTO `__new_leads`("id", "first_name", "last_name", "phone", "email", "program_id", "experience_level", "source", "status", "participant_first_name", "participant_last_name", "participant_age", "guardian_relationship", "campaign_id", "joined_at", "monthly_rate_cents", "sms_consent", "sms_consent_at", "email_consent", "email_consent_at", "created_at", "updated_at") SELECT "id", "first_name", "last_name", "phone", "email", "program_id", "experience_level", "source", "status", "participant_first_name", "participant_last_name", "participant_age", "guardian_relationship", "campaign_id", "joined_at", "monthly_rate_cents", "sms_consent", "sms_consent_at", "email_consent", "email_consent_at", "created_at", "updated_at" FROM `leads`;--> statement-breakpoint
DROP TABLE `leads`;--> statement-breakpoint
ALTER TABLE `__new_leads` RENAME TO `leads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `leads_phone_idx` ON `leads` (`phone`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_program_id_idx` ON `leads` (`program_id`);--> statement-breakpoint
CREATE INDEX `leads_campaign_id_idx` ON `leads` (`campaign_id`);--> statement-breakpoint
UPDATE `programs` SET `active` = 0 WHERE `code` IN ('STRIKING', 'WRESTLING');