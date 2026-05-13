CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`parent_id` int,
	`head_employee_id` int,
	`cost_center` varchar(50),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_manager_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`manager_id` int,
	`start_date` timestamp NOT NULL DEFAULT (now()),
	`end_date` timestamp,
	`changed_by_id` int,
	`reason` varchar(255),
	CONSTRAINT `employee_manager_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employees` ADD `manager_id` int;--> statement-breakpoint
ALTER TABLE `employees` ADD `department_id` int;--> statement-breakpoint
CREATE INDEX `idx_dept_parent` ON `departments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_emhist_employee` ON `employee_manager_history` (`employee_id`);