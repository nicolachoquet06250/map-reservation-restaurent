CREATE TABLE `doors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`x` float NOT NULL,
	`y` float NOT NULL,
	`width` float NOT NULL DEFAULT 60,
	`height` float NOT NULL DEFAULT 10,
	`rotation` float DEFAULT 0,
	CONSTRAINT `doors_id` PRIMARY KEY(`id`)
);
