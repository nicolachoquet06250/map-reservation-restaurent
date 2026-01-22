CREATE TABLE `layers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	CONSTRAINT `layers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rooms` ADD `points` varchar(2000);