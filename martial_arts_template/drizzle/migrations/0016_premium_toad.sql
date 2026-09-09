CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`status` text DEFAULT 'IDEA' NOT NULL,
	`campaign_id` integer,
	`publisher_user_id` integer,
	`approval_required` integer DEFAULT false NOT NULL,
	`approved_by_user_id` integer,
	`approved_at` integer,
	`planned_publish_at` integer,
	`notes` text,
	`created_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`publisher_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `content_items_campaign_id_idx` ON `content_items` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `content_items_status_idx` ON `content_items` (`status`);--> statement-breakpoint
CREATE TABLE `content_item_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_item_id` integer NOT NULL,
	`channel` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_item_channels_pair_unique` ON `content_item_channels` (`content_item_id`,`channel`);--> statement-breakpoint
CREATE INDEX `content_item_channels_content_item_id_idx` ON `content_item_channels` (`content_item_id`);--> statement-breakpoint
CREATE TABLE `content_publications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_item_id` integer NOT NULL,
	`channel` text NOT NULL,
	`published_at` integer NOT NULL,
	`public_url` text,
	`external_post_id` text,
	`recorded_by_user_id` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `content_publications_content_item_id_idx` ON `content_publications` (`content_item_id`);
