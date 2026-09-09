CREATE TABLE `acquisition_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`campaign_id` integer,
	`program_id` integer,
	`registration_opens_at` integer,
	`registration_closes_at` integer,
	`registration_manually_closed` integer DEFAULT false NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acquisition_events_slug_unique` ON `acquisition_events` (`slug`);--> statement-breakpoint
CREATE INDEX `acquisition_events_status_idx` ON `acquisition_events` (`status`);--> statement-breakpoint
CREATE INDEX `acquisition_events_campaign_id_idx` ON `acquisition_events` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `acquisition_event_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`program_id` integer,
	`min_age` integer,
	`max_age` integer,
	`capacity` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `acquisition_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acquisition_event_sessions_event_id_idx` ON `acquisition_event_sessions` (`event_id`);--> statement-breakpoint
CREATE INDEX `acquisition_event_sessions_starts_at_idx` ON `acquisition_event_sessions` (`starts_at`);--> statement-breakpoint
CREATE TABLE `acquisition_event_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`prompt` text NOT NULL,
	`field_type` text NOT NULL,
	`options_json` text,
	`required` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `acquisition_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acquisition_event_questions_event_id_idx` ON `acquisition_event_questions` (`event_id`);--> statement-breakpoint
CREATE TABLE `acquisition_event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`contact_first_name` text NOT NULL,
	`contact_last_name` text,
	`phone` text,
	`email` text,
	`source` text,
	`campaign_id` integer,
	`campaign_tracking_link_id` integer,
	`utm_source` text,
	`utm_medium` text,
	`utm_content` text,
	`utm_term` text,
	`staff_created` integer DEFAULT false NOT NULL,
	`created_by_user_id` integer,
	`exclude_from_processing` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`lead_id` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `acquisition_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_tracking_link_id`) REFERENCES `campaign_tracking_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acquisition_event_registrations_event_id_idx` ON `acquisition_event_registrations` (`event_id`);--> statement-breakpoint
CREATE INDEX `acquisition_event_registrations_lead_id_idx` ON `acquisition_event_registrations` (`lead_id`);--> statement-breakpoint
CREATE INDEX `acquisition_event_registrations_phone_idx` ON `acquisition_event_registrations` (`phone`);--> statement-breakpoint
CREATE TABLE `acquisition_event_registration_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`session_id` integer NOT NULL,
	`relationship` text DEFAULT 'CHILD' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`age` integer,
	`attendance` text DEFAULT 'REGISTERED' NOT NULL,
	`notes` text,
	`lead_line_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `acquisition_event_registrations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `acquisition_event_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lead_line_id`) REFERENCES `lead_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acquisition_event_registration_lines_registration_id_idx` ON `acquisition_event_registration_lines` (`registration_id`);--> statement-breakpoint
CREATE INDEX `acquisition_event_registration_lines_session_id_idx` ON `acquisition_event_registration_lines` (`session_id`);--> statement-breakpoint
CREATE INDEX `acquisition_event_registration_lines_lead_line_id_idx` ON `acquisition_event_registration_lines` (`lead_line_id`);--> statement-breakpoint
CREATE TABLE `acquisition_event_question_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `acquisition_event_registrations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `acquisition_event_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `acquisition_event_question_answers_pair_unique` ON `acquisition_event_question_answers` (`registration_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `acquisition_event_question_answers_registration_id_idx` ON `acquisition_event_question_answers` (`registration_id`);--> statement-breakpoint
CREATE TABLE `acquisition_event_registration_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`actor_user_id` integer,
	`action` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `acquisition_event_registrations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acquisition_event_registration_history_registration_id_idx` ON `acquisition_event_registration_history` (`registration_id`);--> statement-breakpoint
CREATE TABLE `acquisition_event_communication_intents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`kind` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'RECORDED_INTENT' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `acquisition_event_registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `acquisition_event_communication_intents_registration_id_idx` ON `acquisition_event_communication_intents` (`registration_id`);--> statement-breakpoint
ALTER TABLE `follow_up_tasks` ADD `source_event_id` integer REFERENCES acquisition_events(id);--> statement-breakpoint
CREATE UNIQUE INDEX `follow_up_tasks_event_household_unique` ON `follow_up_tasks` (`lead_id`,`source_event_id`) WHERE 
    "follow_up_tasks"."purpose" = 'EVENT_FOLLOW_UP'
    AND "follow_up_tasks"."source_event_id" IS NOT NULL
  ;
