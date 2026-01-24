CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurant_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`address_line` varchar(255),
	`city` varchar(100),
	`postal_code` varchar(30),
	`country` varchar(80),
	`phone` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurateur_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurateurs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `restaurateurs_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurateurs_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `rooms` ADD `location_id` int;