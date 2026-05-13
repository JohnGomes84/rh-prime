CREATE TABLE `overtime_authorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`authorized_date` date NOT NULL,
	`max_hours` decimal(5,2) NOT NULL,
	`type` enum('50%','100%','NOTURNO') NOT NULL,
	`authorized_by_id` int,
	`authorized_at` timestamp NOT NULL DEFAULT (now()),
	`reason` text,
	`consumed` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `overtime_authorizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `overtime_authorizations` ADD CONSTRAINT `overtime_authorizations_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `overtime_authorizations` ADD CONSTRAINT `overtime_authorizations_authorized_by_id_users_id_fk` FOREIGN KEY (`authorized_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_otauth_employee_date` ON `overtime_authorizations` (`employee_id`,`authorized_date`);