ALTER TABLE `customers` ADD `status` text NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `customers` ADD `deactivated_at` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD `deactivated_note` text;
--> statement-breakpoint
ALTER TABLE `customers` ADD `reactivated_at` text;
--> statement-breakpoint
ALTER TABLE `product_instances` ADD `status` text NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `product_instances` ADD `deactivated_at` text;
--> statement-breakpoint
ALTER TABLE `product_instances` ADD `deactivated_note` text;
--> statement-breakpoint
ALTER TABLE `product_instances` ADD `reactivated_at` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `archived_at` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `archive_note` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `final_backup_id` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `final_release_id` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `final_schema_version` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `final_expected_image` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `former_public_hostname` text;
--> statement-breakpoint
ALTER TABLE `environments` ADD `data_removed_at` text;
--> statement-breakpoint
CREATE TABLE `operator_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`action` text NOT NULL,
	`customer_id` text,
	`product_instance_id` text,
	`environment_id` text,
	`summary` text NOT NULL,
	`detail` text
);
--> statement-breakpoint
CREATE INDEX `operator_events_created_at_idx` ON `operator_events` (`created_at`);
--> statement-breakpoint
CREATE INDEX `operator_events_customer_id_idx` ON `operator_events` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `operator_events_environment_id_idx` ON `operator_events` (`environment_id`);
