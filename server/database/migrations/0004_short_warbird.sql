CREATE TABLE `table_attributes` (
	`table_id` int NOT NULL,
	`l_thickness_x` float,
	`l_thickness_y` float,
	`u_thickness` float,
	`u_base_thickness` float,
	CONSTRAINT `table_attributes_table_id` PRIMARY KEY(`table_id`)
);
--> statement-breakpoint
ALTER TABLE `tables` DROP COLUMN `extra_attributes`;