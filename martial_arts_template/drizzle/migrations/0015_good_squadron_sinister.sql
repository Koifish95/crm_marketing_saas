CREATE TABLE `marketing_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`type` text DEFAULT 'OTHER' NOT NULL,
	`description` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`due_at` integer NOT NULL,
	`assignee_user_id` integer,
	`created_by_user_id` integer,
	`campaign_id` integer,
	`content_item_id` integer,
	`asset_id` integer,
	`event_id` integer,
	`notes` text,
	`completed_at` integer,
	`completed_by_user_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`assignee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `marketing_tasks_due_at_idx` ON `marketing_tasks` (`due_at`);--> statement-breakpoint
CREATE INDEX `marketing_tasks_status_idx` ON `marketing_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `marketing_tasks_campaign_id_idx` ON `marketing_tasks` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `marketing_tasks_assignee_user_id_idx` ON `marketing_tasks` (`assignee_user_id`);