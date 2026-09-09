ALTER TABLE `follow_up_tasks` ADD `trial_id` integer REFERENCES trials(id);--> statement-breakpoint
ALTER TABLE `follow_up_tasks` ADD `purpose` text DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `follow_up_tasks` ADD `completed_by_user_id` integer REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `follow_up_tasks_trial_id_idx` ON `follow_up_tasks` (`trial_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `follow_up_tasks_pending_initial_unique` ON `follow_up_tasks` (`trial_id`) WHERE 
    "follow_up_tasks"."purpose" = 'INITIAL_SCHEDULE'
    AND "follow_up_tasks"."status" = 'PENDING'
    AND "follow_up_tasks"."trial_id" IS NOT NULL
  ;