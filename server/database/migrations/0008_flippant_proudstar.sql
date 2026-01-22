ALTER TABLE `rooms` ADD `slug` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_slug_unique` UNIQUE(`slug`);