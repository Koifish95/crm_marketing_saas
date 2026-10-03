CREATE TABLE `qa_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `product_instance_id` text REFERENCES `product_instances`(`id`),
  `environment_id` text REFERENCES `environments`(`id`),
  `environment_type` text NOT NULL,
  `base_url` text NOT NULL,
  `build_version` text,
  `status` text NOT NULL,
  `trigger` text DEFAULT 'manual' NOT NULL,
  `browser` text,
  `viewport` text,
  `started_at` text NOT NULL,
  `completed_at` text,
  `error_summary` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `qa_runs_product_id_idx` ON `qa_runs` (`product_id`);
--> statement-breakpoint
CREATE INDEX `qa_runs_environment_id_idx` ON `qa_runs` (`environment_id`);
--> statement-breakpoint
CREATE INDEX `qa_runs_started_at_idx` ON `qa_runs` (`started_at`);
--> statement-breakpoint
CREATE TABLE `qa_run_workflows` (
  `id` text PRIMARY KEY NOT NULL,
  `qa_run_id` text NOT NULL REFERENCES `qa_runs`(`id`),
  `name` text NOT NULL,
  `status` text NOT NULL,
  `started_at` text NOT NULL,
  `completed_at` text,
  `error_summary` text,
  `routes` text
);
--> statement-breakpoint
CREATE INDEX `qa_run_workflows_run_id_idx` ON `qa_run_workflows` (`qa_run_id`);
--> statement-breakpoint
CREATE TABLE `qa_findings` (
  `id` text PRIMARY KEY NOT NULL,
  `qa_run_id` text NOT NULL REFERENCES `qa_runs`(`id`),
  `product_id` text NOT NULL,
  `environment_id` text REFERENCES `environments`(`id`),
  `route` text,
  `workflow` text,
  `category` text NOT NULL,
  `severity` text NOT NULL,
  `status` text DEFAULT 'NEW' NOT NULL,
  `title` text NOT NULL,
  `observation` text NOT NULL,
  `expected_behavior` text,
  `reproduction_steps` text,
  `suggested_remediation` text,
  `detection_method` text NOT NULL,
  `confidence` text,
  `rationale` text,
  `console_context` text,
  `network_context` text,
  `duplicate_of_finding_id` text,
  `reviewed_at` text,
  `review_note` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `qa_findings_run_id_idx` ON `qa_findings` (`qa_run_id`);
--> statement-breakpoint
CREATE INDEX `qa_findings_status_idx` ON `qa_findings` (`status`);
--> statement-breakpoint
CREATE INDEX `qa_findings_category_idx` ON `qa_findings` (`category`);
--> statement-breakpoint
CREATE INDEX `qa_findings_severity_idx` ON `qa_findings` (`severity`);
--> statement-breakpoint
CREATE TABLE `qa_evidence` (
  `id` text PRIMARY KEY NOT NULL,
  `qa_run_id` text NOT NULL REFERENCES `qa_runs`(`id`),
  `finding_id` text REFERENCES `qa_findings`(`id`),
  `kind` text NOT NULL,
  `storage_key` text NOT NULL,
  `file_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `bytes` integer NOT NULL,
  `sha256` text NOT NULL,
  `route` text,
  `metadata` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qa_evidence_storage_key_unique` ON `qa_evidence` (`storage_key`);
--> statement-breakpoint
CREATE INDEX `qa_evidence_run_id_idx` ON `qa_evidence` (`qa_run_id`);
--> statement-breakpoint
CREATE INDEX `qa_evidence_finding_id_idx` ON `qa_evidence` (`finding_id`);
--> statement-breakpoint
CREATE TABLE `tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `source` text NOT NULL,
  `category` text NOT NULL,
  `status` text DEFAULT 'NEW' NOT NULL,
  `priority` text DEFAULT 'MEDIUM' NOT NULL,
  `severity` text,
  `assignee` text,
  `customer_id` text REFERENCES `customers`(`id`),
  `product_id` text,
  `product_instance_id` text REFERENCES `product_instances`(`id`),
  `environment_id` text REFERENCES `environments`(`id`),
  `resolution` text,
  `resolved_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_key_unique` ON `tickets` (`key`);
--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);
--> statement-breakpoint
CREATE INDEX `tickets_source_idx` ON `tickets` (`source`);
--> statement-breakpoint
CREATE INDEX `tickets_category_idx` ON `tickets` (`category`);
--> statement-breakpoint
CREATE INDEX `tickets_priority_idx` ON `tickets` (`priority`);
--> statement-breakpoint
CREATE INDEX `tickets_customer_id_idx` ON `tickets` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `tickets_environment_id_idx` ON `tickets` (`environment_id`);
--> statement-breakpoint
CREATE INDEX `tickets_updated_at_idx` ON `tickets` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
  `id` text PRIMARY KEY NOT NULL,
  `ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
  `author` text NOT NULL,
  `body` text NOT NULL,
  `visibility` text DEFAULT 'INTERNAL' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ticket_comments_ticket_id_idx` ON `ticket_comments` (`ticket_id`);
--> statement-breakpoint
CREATE TABLE `ticket_activity` (
  `id` text PRIMARY KEY NOT NULL,
  `ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
  `action` text NOT NULL,
  `actor` text NOT NULL,
  `detail` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ticket_activity_ticket_id_idx` ON `ticket_activity` (`ticket_id`);
--> statement-breakpoint
CREATE INDEX `ticket_activity_created_at_idx` ON `ticket_activity` (`created_at`);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
  `evidence_id` text REFERENCES `qa_evidence`(`id`),
  `label` text NOT NULL,
  `external_url` text,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ticket_attachments_ticket_id_idx` ON `ticket_attachments` (`ticket_id`);
--> statement-breakpoint
CREATE TABLE `ticket_relations` (
  `id` text PRIMARY KEY NOT NULL,
  `ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
  `related_ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
  `relation_type` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_relations_unique` ON `ticket_relations` (`ticket_id`,`related_ticket_id`,`relation_type`);
--> statement-breakpoint
CREATE TABLE `finding_ticket_links` (
  `id` text PRIMARY KEY NOT NULL,
  `finding_id` text NOT NULL REFERENCES `qa_findings`(`id`),
  `ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
  `link_type` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finding_ticket_links_unique` ON `finding_ticket_links` (`finding_id`,`ticket_id`);
--> statement-breakpoint
CREATE INDEX `finding_ticket_links_ticket_id_idx` ON `finding_ticket_links` (`ticket_id`);
