ALTER TABLE `environments` ADD `access_url` text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE `environments` SET `access_url` = 'http://localhost:' || CASE
  WHEN `host_port` > 0 THEN `host_port`
  ELSE CAST(
    replace(
      replace(`health_url`, 'http://127.0.0.1:', ''),
      '/api/health',
      ''
    ) AS INTEGER
  )
END
WHERE `access_url` = '' OR `access_url` IS NULL;
