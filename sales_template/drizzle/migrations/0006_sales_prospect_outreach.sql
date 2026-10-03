ALTER TABLE `sales_prospects` ADD `outreach_status` text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_prospects` ADD `next_touch_at` integer;
--> statement-breakpoint
ALTER TABLE `sales_prospects` ADD `sequence_started_at` integer;
--> statement-breakpoint
ALTER TABLE `sales_prospects` ADD `email_source_url` text;
--> statement-breakpoint
CREATE INDEX `sales_prospects_outreach_status_idx` ON `sales_prospects` (`outreach_status`);
--> statement-breakpoint
UPDATE `sales_prospects` SET `lane` = 'local' WHERE upper(`state`) IN ('UT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'NV');
--> statement-breakpoint
UPDATE `sales_prospects` SET `outreach_status` = 'ready'
WHERE `status` NOT IN ('promoted', 'do_not_contact')
  AND trim(`name`) != ''
  AND `city` IS NOT NULL AND trim(`city`) != ''
  AND `state` IS NOT NULL AND upper(`state`) NOT IN ('UT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'NV')
  AND `website` IS NOT NULL AND trim(`website`) != ''
  AND `email` IS NOT NULL AND instr(`email`, '@') > 1;
--> statement-breakpoint
CREATE TABLE `sales_prospect_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`step` integer NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`delivery` text DEFAULT 'queued' NOT NULL,
	`provider_message_id` text,
	`open_token` text,
	`sent_at` integer,
	`delivered_at` integer,
	`bounced_at` integer,
	`opened_at` integer,
	`reply_excerpt` text,
	`reply_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `sales_prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_prospect_messages_prospect_step_unique` ON `sales_prospect_messages` (`prospect_id`, `step`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_prospect_messages_open_token_unique` ON `sales_prospect_messages` (`open_token`);
--> statement-breakpoint
CREATE INDEX `sales_prospect_messages_provider_message_id_idx` ON `sales_prospect_messages` (`provider_message_id`);
--> statement-breakpoint
CREATE INDEX `sales_prospect_messages_sent_at_idx` ON `sales_prospect_messages` (`sent_at`);
--> statement-breakpoint
CREATE TABLE `sales_prospect_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`state_code` text NOT NULL,
	`status` text NOT NULL,
	`stored_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`detail` text,
	`error` text,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `sales_prospect_runs_status_idx` ON `sales_prospect_runs` (`status`);
