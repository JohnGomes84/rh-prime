CREATE TABLE `time_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`clock_in` timestamp NOT NULL,
	`clock_out` timestamp,
	`hours_worked` decimal(6,2),
	`location` varchar(255),
	`notes` text,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`approved_by_id` int,
	`approved_at` timestamp,
	`updated_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `time_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `overtime_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`time_record_id` int NOT NULL,
	`hours_worked` decimal(6,2) NOT NULL,
	`overtime_hours` decimal(6,2) NOT NULL,
	`multiplier` decimal(3,2) NOT NULL,
	`type` enum('50%','100%','NOTURNO') NOT NULL,
	`reason` text,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`approved_by_id` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `overtime_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `time_records` ADD CONSTRAINT `time_records_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `time_records` ADD CONSTRAINT `time_records_approved_by_id_users_id_fk` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `time_records` ADD CONSTRAINT `time_records_updated_by_id_users_id_fk` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD CONSTRAINT `overtime_records_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD CONSTRAINT `overtime_records_time_record_id_time_records_id_fk` FOREIGN KEY (`time_record_id`) REFERENCES `time_records`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD CONSTRAINT `overtime_records_approved_by_id_users_id_fk` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_time_employee_clockin` ON `time_records` (`employee_id`,`clock_in`);--> statement-breakpoint
CREATE INDEX `idx_time_employee_status` ON `time_records` (`employee_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_time_clockin` ON `time_records` (`clock_in`);--> statement-breakpoint
CREATE INDEX `idx_ot_employee_status` ON `overtime_records` (`employee_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_ot_timerecord` ON `overtime_records` (`time_record_id`);--> statement-breakpoint
CREATE INDEX `idx_ot_type` ON `overtime_records` (`type`);--> statement-breakpoint
CREATE INDEX `idx_ot_employee_created` ON `overtime_records` (`employee_id`,`created_at`);
