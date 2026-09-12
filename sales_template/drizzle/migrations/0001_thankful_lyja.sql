CREATE TABLE `sales_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`phone` text,
	`reachability_note` text,
	`account_id` integer,
	`stage` text DEFAULT 'new' NOT NULL,
	`owner_user_id` integer,
	`converted_at` integer,
	`converted_account_id` integer,
	`converted_contact_id` integer,
	`converted_opportunity_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_contact_id`) REFERENCES `sales_contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_leads_stage_idx` ON `sales_leads` (`stage`);--> statement-breakpoint
CREATE INDEX `sales_leads_owner_user_id_idx` ON `sales_leads` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `sales_leads_account_id_idx` ON `sales_leads` (`account_id`);--> statement-breakpoint
CREATE TABLE `sales_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`record_kind` text NOT NULL,
	`record_id` integer NOT NULL,
	`body` text NOT NULL,
	`author_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_notes_record_idx` ON `sales_notes` (`record_kind`,`record_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales_opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`primary_contact_id` integer,
	`source_lead_id` integer,
	`name` text NOT NULL,
	`amount_cents` integer,
	`stage` text DEFAULT 'proposal_quote' NOT NULL,
	`owner_user_id` integer,
	`loss_reason` text,
	`loss_notes` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `sales_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_contact_id`) REFERENCES `sales_contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_lead_id`) REFERENCES `sales_leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_sales_opportunities`("id", "account_id", "primary_contact_id", "source_lead_id", "name", "amount_cents", "stage", "owner_user_id", "loss_reason", "loss_notes", "notes", "created_at", "updated_at")
SELECT
	"id",
	"account_id",
	"primary_contact_id",
	NULL,
	"name",
	"amount_cents",
	CASE "stage"
		WHEN 'open' THEN 'proposal_quote'
		WHEN 'in_progress' THEN 'decision'
		ELSE "stage"
	END,
	(SELECT "id" FROM "users" ORDER BY "id" LIMIT 1),
	CASE WHEN "stage" = 'lost' THEN 'other' ELSE NULL END,
	CASE WHEN "stage" = 'lost' THEN 'Migrated from C2A' ELSE NULL END,
	"notes",
	"created_at",
	"updated_at"
FROM `sales_opportunities`;--> statement-breakpoint
DROP TABLE `sales_opportunities`;--> statement-breakpoint
ALTER TABLE `__new_sales_opportunities` RENAME TO `sales_opportunities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sales_opportunities_account_id_idx` ON `sales_opportunities` (`account_id`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_stage_idx` ON `sales_opportunities` (`stage`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_owner_user_id_idx` ON `sales_opportunities` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `sales_opportunities_source_lead_id_idx` ON `sales_opportunities` (`source_lead_id`);--> statement-breakpoint
ALTER TABLE `sales_activities` ADD `lead_id` integer REFERENCES sales_leads(id);--> statement-breakpoint
ALTER TABLE `sales_activities` ADD `owner_user_id` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `sales_activities` ADD `type` text DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales_activities` ADD `status` text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales_activities` ADD `notes` text;--> statement-breakpoint
CREATE INDEX `sales_activities_lead_id_idx` ON `sales_activities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `sales_activities_owner_user_id_idx` ON `sales_activities` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `sales_activities_status_idx` ON `sales_activities` (`status`);--> statement-breakpoint
UPDATE `sales_activities` SET `status` = 'completed' WHERE `completed_at` IS NOT NULL;--> statement-breakpoint
UPDATE `sales_activities` SET `owner_user_id` = (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1) WHERE `owner_user_id` IS NULL;