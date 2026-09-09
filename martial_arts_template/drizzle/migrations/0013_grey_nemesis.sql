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
ALTER TABLE `users` ADD `user_type_id` integer REFERENCES user_types(id);--> statement-breakpoint
CREATE INDEX `users_user_type_id_idx` ON `users` (`user_type_id`);
