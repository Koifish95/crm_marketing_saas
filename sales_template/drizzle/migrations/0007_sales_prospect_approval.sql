ALTER TABLE `sales_prospects` ADD `approved_by_user_id` integer REFERENCES `users`(`id`);
--> statement-breakpoint
ALTER TABLE `sales_prospects` ADD `approved_at` integer;
--> statement-breakpoint
UPDATE `sales_prospects` SET `outreach_status` = 'awaiting_approval'
WHERE `outreach_status` = 'ready'
  AND NOT EXISTS (
    SELECT 1 FROM `sales_prospect_messages` m
    WHERE m.`prospect_id` = `sales_prospects`.`id` AND m.`sent_at` IS NOT NULL
  );
