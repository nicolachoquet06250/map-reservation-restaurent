CREATE TABLE `chairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`table_id` int NOT NULL,
	`x` float NOT NULL,
	`y` float NOT NULL,
	`relative_x` float NOT NULL,
	`relative_y` float NOT NULL,
	CONSTRAINT `chairs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chair_id` int NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`reservation_date` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room_id` int NOT NULL,
	`name` varchar(50),
	`x` float NOT NULL,
	`y` float NOT NULL,
	`width` float NOT NULL,
	`height` float NOT NULL,
	`shape` varchar(20) DEFAULT 'rectangle',
	CONSTRAINT `tables_id` PRIMARY KEY(`id`)
);
