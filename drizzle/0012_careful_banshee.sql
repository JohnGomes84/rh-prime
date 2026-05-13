ALTER TABLE `overtime_records` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `overtime_records` MODIFY COLUMN `employee_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `overtime_records` MODIFY COLUMN `time_record_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `overtime_records` MODIFY COLUMN `approved_by_id` int;--> statement-breakpoint
ALTER TABLE `time_records` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `time_records` MODIFY COLUMN `employee_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `time_records` MODIFY COLUMN `approved_by_id` int;--> statement-breakpoint
ALTER TABLE `time_records` MODIFY COLUMN `updated_by_id` int;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD `reason` text;--> statement-breakpoint
ALTER TABLE `time_records` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `time_records` ADD `notes` text;