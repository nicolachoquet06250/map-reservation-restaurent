CREATE TABLE `zones` (
	`id` int NOT NULL AUTO_INCREMENT,
	`room_id` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`x` float NOT NULL,
	`y` float NOT NULL,
	`width` float NOT NULL,
	`height` float NOT NULL,
	CONSTRAINT `zones_id` PRIMARY KEY(`id`)
);
