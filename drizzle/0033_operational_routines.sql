CREATE TABLE `operational_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_op_clients_name` ON `operational_clients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_op_clients_status` ON `operational_clients` (`status`);--> statement-breakpoint
CREATE TABLE `operational_routines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`area` enum('financeiro','rh','operacional','administrativo') NOT NULL DEFAULT 'financeiro',
	`routine_type` enum('medicao','nota_fiscal','envio_boleto','cobranca_retorno','lancamento','pagamento_operacional','conferencia_baixa','fechamento','outro') NOT NULL,
	`frequency` enum('weekly','biweekly','monthly') NOT NULL DEFAULT 'monthly',
	`day_of_week` int,
	`day_of_month` int,
	`generate_lead_days` int NOT NULL DEFAULT 7,
	`reminder_days` json NOT NULL,
	`overdue_reminder_enabled` boolean NOT NULL DEFAULT true,
	`assignee_user_id` int,
	`board_id` int,
	`list_id` int,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`requires_review` boolean NOT NULL DEFAULT false,
	`checklist_template` json NOT NULL,
	`instructions` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_routines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_op_routines_client` ON `operational_routines` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_op_routines_active` ON `operational_routines` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_op_routines_assignee` ON `operational_routines` (`assignee_user_id`);--> statement-breakpoint
CREATE TABLE `operational_routine_occurrences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routine_id` int NOT NULL,
	`client_id` int NOT NULL,
	`period_ref` varchar(20) NOT NULL,
	`due_date` date NOT NULL,
	`card_id` int,
	`status` enum('pending','in_progress','waiting_return','waiting_review','done','overdue','not_applicable') NOT NULL DEFAULT 'pending',
	`next_action` varchar(255),
	`operational_notes` text,
	`completed_at` timestamp,
	`reviewed_at` timestamp,
	`reviewed_by` int,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_routine_occurrences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_op_occ_routine_period` ON `operational_routine_occurrences` (`routine_id`,`period_ref`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_routine` ON `operational_routine_occurrences` (`routine_id`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_client` ON `operational_routine_occurrences` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_due` ON `operational_routine_occurrences` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_card` ON `operational_routine_occurrences` (`card_id`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_status` ON `operational_routine_occurrences` (`status`);--> statement-breakpoint
CREATE TABLE `operational_routine_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`occurrence_id` int NOT NULL,
	`reminder_key` varchar(40) NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_routine_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_op_rem_occ_key` ON `operational_routine_reminders` (`occurrence_id`,`reminder_key`);--> statement-breakpoint
CREATE INDEX `idx_op_rem_occ` ON `operational_routine_reminders` (`occurrence_id`);
