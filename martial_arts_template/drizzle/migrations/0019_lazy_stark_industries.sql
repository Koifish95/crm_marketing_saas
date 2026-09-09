CREATE TABLE `compensation_attributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_line_id` integer NOT NULL,
	`credited_user_id` integer,
	`campaign_id` integer,
	`campaign_tracking_link_id` integer,
	`event_id` integer,
	`established_at` integer NOT NULL,
	`method` text NOT NULL,
	`origin` text NOT NULL,
	`eligibility` text DEFAULT 'UNASSIGNED' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credited_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_tracking_link_id`) REFERENCES `campaign_tracking_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `acquisition_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `compensation_attributions_lead_line_id_unique` ON `compensation_attributions` (`lead_line_id`);--> statement-breakpoint
CREATE INDEX `compensation_attributions_credited_user_id_idx` ON `compensation_attributions` (`credited_user_id`);--> statement-breakpoint
CREATE TABLE `compensation_attribution_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_line_id` integer NOT NULL,
	`attribution_id` integer,
	`credited_user_id` integer,
	`campaign_id` integer,
	`campaign_tracking_link_id` integer,
	`event_id` integer,
	`method` text NOT NULL,
	`origin` text NOT NULL,
	`eligibility` text NOT NULL,
	`reason` text,
	`actor_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attribution_id`) REFERENCES `compensation_attributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credited_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_tracking_link_id`) REFERENCES `campaign_tracking_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `acquisition_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `compensation_attribution_history_lead_line_id_idx` ON `compensation_attribution_history` (`lead_line_id`);--> statement-breakpoint
CREATE TABLE `compensation_earned` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_line_id` integer NOT NULL,
	`conversion_id` integer NOT NULL,
	`credited_user_id` integer NOT NULL,
	`campaign_id` integer,
	`campaign_tracking_link_id` integer,
	`event_id` integer,
	`offering_name` text,
	`monthly_cents` integer NOT NULL,
	`basis` text NOT NULL,
	`basis_bps` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`earned_at` integer NOT NULL,
	`payment_status` text DEFAULT 'UNPAID' NOT NULL,
	`paid_at` integer,
	`paid_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversion_id`) REFERENCES `conversions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credited_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `compensation_earned_conversion_id_unique` ON `compensation_earned` (`conversion_id`);--> statement-breakpoint
CREATE INDEX `compensation_earned_credited_user_id_idx` ON `compensation_earned` (`credited_user_id`);--> statement-breakpoint
CREATE INDEX `compensation_earned_payment_status_idx` ON `compensation_earned` (`payment_status`);
