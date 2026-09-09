ALTER TABLE `customers` ADD `timezone` text NOT NULL DEFAULT 'America/Denver';--> statement-breakpoint
ALTER TABLE `customers` ADD `admin_email` text NOT NULL DEFAULT 'admin@lab-acme.local';--> statement-breakpoint
ALTER TABLE `environments` ADD `host_port` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `environments` ADD `lifecycle_status` text NOT NULL DEFAULT 'ready';
