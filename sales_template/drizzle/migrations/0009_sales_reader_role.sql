INSERT INTO `user_roles` (`code`, `name`, `description`, `created_at`, `updated_at`)
SELECT 'SALES_READER', 'Sales reader', 'Read Companies, Contacts, Opportunities, and Activities. Cannot change them.', CAST(strftime('%s','now') AS integer) * 1000, CAST(strftime('%s','now') AS integer) * 1000
WHERE NOT EXISTS (SELECT 1 FROM `user_roles` WHERE `code` = 'SALES_READER');
--> statement-breakpoint
INSERT INTO `user_role_access_rights` (`user_role_id`, `access_right`, `created_at`)
SELECT `user_roles`.`id`, 'VIEW_SALES', CAST(strftime('%s','now') AS integer) * 1000
FROM `user_roles`
WHERE `user_roles`.`code` = 'SALES_READER'
  AND NOT EXISTS (
    SELECT 1 FROM `user_role_access_rights`
    WHERE `user_role_access_rights`.`user_role_id` = `user_roles`.`id`
      AND `user_role_access_rights`.`access_right` = 'VIEW_SALES'
  );
--> statement-breakpoint
INSERT INTO `user_type_roles` (`user_type_id`, `user_role_id`, `created_at`)
SELECT `user_types`.`id`, `user_roles`.`id`, CAST(strftime('%s','now') AS integer) * 1000
FROM `user_types`, `user_roles`
WHERE `user_types`.`code` = 'VIEWER'
  AND `user_roles`.`code` = 'SALES_READER'
  AND NOT EXISTS (
    SELECT 1 FROM `user_type_roles`
    WHERE `user_type_roles`.`user_type_id` = `user_types`.`id`
      AND `user_type_roles`.`user_role_id` = `user_roles`.`id`
  );
