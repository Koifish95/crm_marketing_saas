ALTER TABLE `environments` ADD `public_hostname` text;
CREATE UNIQUE INDEX `environments_public_hostname_unique` ON `environments` (`public_hostname`);
