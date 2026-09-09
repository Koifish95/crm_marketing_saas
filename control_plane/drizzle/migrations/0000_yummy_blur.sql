CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`industry_template` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_slug_unique` ON `customers` (`slug`);--> statement-breakpoint
CREATE TABLE `environments` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`hosting_node_id` text NOT NULL,
	`type` text NOT NULL,
	`display_name` text NOT NULL,
	`slug` text NOT NULL,
	`container_name` text NOT NULL,
	`compose_project` text NOT NULL,
	`compose_file` text NOT NULL,
	`env_file_local` text NOT NULL,
	`env_file_example` text NOT NULL,
	`health_url` text NOT NULL,
	`sqlite_volume` text NOT NULL,
	`assets_volume` text NOT NULL,
	`expected_image` text NOT NULL,
	`isolation_marker` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hosting_node_id`) REFERENCES `hosting_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `environments_slug_unique` ON `environments` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `environments_container_unique` ON `environments` (`container_name`);--> statement-breakpoint
CREATE INDEX `environments_customer_id_idx` ON `environments` (`customer_id`);--> statement-breakpoint
CREATE TABLE `hosting_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`driver` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hosting_nodes_name_unique` ON `hosting_nodes` (`name`);