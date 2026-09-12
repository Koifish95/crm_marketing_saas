CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` integer,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sales_accounts_name_idx` ON `sales_accounts` (`name`);--> statement-breakpoint
CREATE TABLE `sales_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer,
	`contact_id` integer,
	`opportunity_id` integer,
	`description` text NOT NULL,
	`due_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `sales_contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `sales_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_activities_account_id_idx` ON `sales_activities` (`account_id`);--> statement-breakpoint
CREATE INDEX `sales_activities_contact_id_idx` ON `sales_activities` (`contact_id`);--> statement-breakpoint
CREATE INDEX `sales_activities_opportunity_id_idx` ON `sales_activities` (`opportunity_id`);--> statement-breakpoint
CREATE TABLE `sales_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`title` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_contacts_account_id_idx` ON `sales_contacts` (`account_id`);--> statement-breakpoint
CREATE TABLE `sales_opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`primary_contact_id` integer,
	`name` text NOT NULL,
	`amount_cents` integer,
	`stage` text DEFAULT 'open' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_contact_id`) REFERENCES `sales_contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_opportunities_account_id_idx` ON `sales_opportunities` (`account_id`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_stage_idx` ON `sales_opportunities` (`stage`);--> statement-breakpoint
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
CREATE TABLE `user_role_access_rights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_role_id` integer NOT NULL,
	`access_right` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_role_id`) REFERENCES `user_roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_role_access_rights_pair_unique` ON `user_role_access_rights` (`user_role_id`,`access_right`);--> statement-breakpoint
CREATE INDEX `user_role_access_rights_user_role_id_idx` ON `user_role_access_rights` (`user_role_id`);--> statement-breakpoint
CREATE TABLE `user_role_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`user_role_id` integer NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_role_id`) REFERENCES `user_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_role_assignments_pair_unique` ON `user_role_assignments` (`user_id`,`user_role_id`);--> statement-breakpoint
CREATE INDEX `user_role_assignments_user_id_idx` ON `user_role_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_role_assignments_user_role_id_idx` ON `user_role_assignments` (`user_role_id`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_code_unique` ON `user_roles` (`code`);--> statement-breakpoint
CREATE TABLE `user_type_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_type_id` integer NOT NULL,
	`user_role_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_type_id`) REFERENCES `user_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_role_id`) REFERENCES `user_roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_type_roles_pair_unique` ON `user_type_roles` (`user_type_id`,`user_role_id`);--> statement-breakpoint
CREATE INDEX `user_type_roles_user_type_id_idx` ON `user_type_roles` (`user_type_id`);--> statement-breakpoint
CREATE INDEX `user_type_roles_user_role_id_idx` ON `user_type_roles` (`user_role_id`);--> statement-breakpoint
CREATE TABLE `user_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`coarse_role` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_types_code_unique` ON `user_types` (`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`password_hash` text,
	`must_change_password` integer DEFAULT false NOT NULL,
	`session_version` integer DEFAULT 0 NOT NULL,
	`last_login_at` integer,
	`user_type_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_type_id`) REFERENCES `user_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_user_type_id_idx` ON `users` (`user_type_id`);