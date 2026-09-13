CREATE TABLE `sales_proposal_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`revision_id` integer NOT NULL,
	`offer_id` integer,
	`offer_name` text,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`pricing_type` text NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`revision_id`) REFERENCES `sales_proposal_revisions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`offer_id`) REFERENCES `sales_offers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_proposal_lines_revision_id_idx` ON `sales_proposal_lines` (`revision_id`);--> statement-breakpoint
CREATE TABLE `sales_proposal_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proposal_id` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`intro` text,
	`terms` text,
	`notes` text,
	`valid_through` text,
	`issued_at` integer,
	`sent_at` integer,
	`accepted_at` integer,
	`declined_at` integer,
	`recipient_contact_id` integer,
	`recipient_first_name` text,
	`recipient_last_name` text,
	`recipient_title` text,
	`recipient_email` text,
	`recipient_phone` text,
	`company_name` text,
	`letterhead_name` text,
	`letterhead_address` text,
	`letterhead_phone` text,
	`letterhead_email` text,
	`letterhead_website` text,
	`letterhead_footer` text,
	`letterhead_logo_path` text,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`mrr_cents` integer DEFAULT 0 NOT NULL,
	`generated_pdf_path` text,
	`signed_pdf_path` text,
	`signed_pdf_original_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `sales_proposals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_contact_id`) REFERENCES `sales_contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_proposal_revisions_proposal_revision_unique` ON `sales_proposal_revisions` (`proposal_id`,`revision`);--> statement-breakpoint
CREATE INDEX `sales_proposal_revisions_proposal_id_idx` ON `sales_proposal_revisions` (`proposal_id`);--> statement-breakpoint
CREATE INDEX `sales_proposal_revisions_status_idx` ON `sales_proposal_revisions` (`status`);--> statement-breakpoint
CREATE TABLE `sales_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`opportunity_id` integer NOT NULL,
	`proposal_number` text NOT NULL,
	`current_revision_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `sales_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_proposals_opportunity_id_unique` ON `sales_proposals` (`opportunity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_proposals_proposal_number_unique` ON `sales_proposals` (`proposal_number`);