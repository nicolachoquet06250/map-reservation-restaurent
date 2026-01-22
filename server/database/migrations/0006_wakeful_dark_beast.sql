CREATE TABLE `room_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`units` varchar(5000) NOT NULL,
	CONSTRAINT `room_zones_id` PRIMARY KEY(`id`)
);
