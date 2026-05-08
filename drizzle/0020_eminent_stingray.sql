CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`approver_user_id` int,
	`level` int NOT NULL DEFAULT 1,
	`decision` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`reason` text,
	`decided_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('ferias','atestado','ajuste_ponto','abono','horas_extras','declaracao','adiantamento','outro') NOT NULL,
	`employee_id` int NOT NULL,
	`status` enum('PENDING','IN_REVIEW','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`priority` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
	`subject` varchar(255) NOT NULL,
	`description` text,
	`payload` json,
	`related_resource_type` varchar(60),
	`related_resource_id` int,
	`sla_due_at` timestamp,
	`created_by_id` int,
	`resolved_by_id` int,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_appr_request` ON `approvals` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_req_employee` ON `requests` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_req_status` ON `requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_req_kind` ON `requests` (`kind`);