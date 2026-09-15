CREATE TABLE `product_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`display_name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_instances_customer_product_unique` ON `product_instances` (`customer_id`,`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_instances_customer_slug_unique` ON `product_instances` (`customer_id`,`slug`);--> statement-breakpoint
CREATE INDEX `product_instances_customer_id_idx` ON `product_instances` (`customer_id`);--> statement-breakpoint
INSERT INTO `product_instances` (`id`, `customer_id`, `product_id`, `display_name`, `slug`, `created_at`)
SELECT `id` || '-martial-arts', `id`, 'martial-arts', `display_name`, `slug`, `created_at`
FROM `customers`;--> statement-breakpoint
ALTER TABLE `environments` ADD `product_instance_id` text REFERENCES `product_instances`(`id`);--> statement-breakpoint
UPDATE `environments` SET `product_instance_id` = `customer_id` || '-martial-arts' WHERE `product_instance_id` IS NULL;--> statement-breakpoint
CREATE INDEX `environments_product_instance_id_idx` ON `environments` (`product_instance_id`);
