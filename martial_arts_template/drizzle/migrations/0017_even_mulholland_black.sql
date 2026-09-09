CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`original_filename` text NOT NULL,
	`media_type` text NOT NULL,
	`storage_path` text NOT NULL,
	`description` text,
	`marketing_use_status` text DEFAULT 'UNKNOWN' NOT NULL,
	`restriction_note` text,
	`archived` integer DEFAULT false NOT NULL,
	`uploaded_by_user_id` integer,
	`campaign_id` integer,
	`content_item_id` integer,
	`event_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_campaign_id_idx` ON `assets` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `assets_marketing_use_status_idx` ON `assets` (`marketing_use_status`);--> statement-breakpoint
CREATE TABLE `asset_usages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`content_item_id` integer,
	`campaign_id` integer,
	`usage_kind` text DEFAULT 'ATTACHED' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_item_id`) REFERENCES `content_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `asset_usages_asset_id_idx` ON `asset_usages` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_usages_content_item_id_idx` ON `asset_usages` (`content_item_id`);
