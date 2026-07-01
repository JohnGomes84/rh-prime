CREATE TABLE `document_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`signatoryType` varchar(40) NOT NULL,
	`signatoryId` int NOT NULL,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`signatureMethod` varchar(30) DEFAULT 'electronic',
	CONSTRAINT `document_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_automations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board_id` int NOT NULL,
	`trigger_list_id` int NOT NULL,
	`action_type` varchar(40) NOT NULL,
	`action_config` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_card_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`uploaded_by` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(500) NOT NULL,
	`pathname` varchar(500),
	`content_type` varchar(100),
	`size_bytes` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_card_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_card_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`user_id` int NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_card_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_card_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`from_list_id` int,
	`to_list_id` int NOT NULL,
	`user_id` int NOT NULL,
	`moved_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_card_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mr_report_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`report_id` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`expected_content` text,
	`value` text,
	`item_status` enum('pendente','em_andamento','concluido') NOT NULL DEFAULT 'pendente',
	`carried_over` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `mr_report_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mr_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_key` varchar(48) NOT NULL,
	`sector` enum('rh_admin','financeiro') NOT NULL,
	`cadence` enum('semanal','mensal') NOT NULL,
	`period_ref` varchar(10) NOT NULL,
	`due_date` date NOT NULL,
	`author_id` int NOT NULL,
	`status` enum('rascunho','enviado','validado','devolvido') NOT NULL DEFAULT 'rascunho',
	`was_on_time` boolean,
	`summary` text,
	`points_for_validator` text,
	`next_priorities` text,
	`submitted_at` timestamp,
	`validated_at` timestamp,
	`validated_by` int,
	`rejection_note` text,
	`locked_snapshot` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mr_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_mr_reports_period` UNIQUE(`sector`,`cadence`,`period_ref`)
);
--> statement-breakpoint
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
	CONSTRAINT `operational_routine_occurrences_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_op_occ_routine_period` UNIQUE(`routine_id`,`period_ref`)
);
--> statement-breakpoint
CREATE TABLE `operational_routine_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`occurrence_id` int NOT NULL,
	`reminder_key` varchar(40) NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_routine_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_op_rem_occ_key` UNIQUE(`occurrence_id`,`reminder_key`)
);
--> statement-breakpoint
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
CREATE TABLE `demand_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`demand_id` int NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_url` varchar(1024) NOT NULL,
	`uploaded_by_id` int NOT NULL,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demand_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requester_id` int NOT NULL,
	`classifier_id` int,
	`executor_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('baixa','normal','alta','urgente') NOT NULL DEFAULT 'normal',
	`category` enum('rh_adm','financeiro','operacional') NOT NULL,
	`status` enum('pendente','classificada','em_andamento','aguardando_retorno','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`due_date` date NOT NULL,
	`classified_at` timestamp,
	`started_at` timestamp,
	`returned_at` timestamp,
	`completed_at` timestamp,
	`was_on_time` boolean,
	`classification_notes` text,
	`return_notes` text,
	`completion_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `code` varchar(100);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `kind` varchar(30) DEFAULT 'manual_validation' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `status` varchar(30) DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `document_policy` varchar(30) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `template_policy` varchar(30) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `template_key` varchar(100);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `signature_policy` varchar(30) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `review_policy` varchar(30) DEFAULT 'manual_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `review_status` varchar(20);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `reviewed_by_id` int;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `reviewed_at` timestamp;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `review_notes` text;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `waived_reason` text;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `waived_by_id` int;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD `waived_at` timestamp;--> statement-breakpoint
ALTER TABLE `admission_workflows` ADD `sync_status` varchar(20) DEFAULT 'NOT_SYNCED' NOT NULL;--> statement-breakpoint
ALTER TABLE `admission_workflows` ADD `catalog_version` varchar(20);--> statement-breakpoint
ALTER TABLE `checklist_items` ADD `sourceWorkflowId` int;--> statement-breakpoint
ALTER TABLE `checklist_items` ADD `sourceItemId` int;--> statement-breakpoint
ALTER TABLE `checklist_items` ADD `mirrorOrigin` varchar(50);--> statement-breakpoint
ALTER TABLE `checklist_items` ADD `isEditable` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `document_templates` ADD `machine_key` varchar(100);--> statement-breakpoint
ALTER TABLE `documents` ADD `origin` varchar(30);--> statement-breakpoint
ALTER TABLE `documents` ADD `admission_workflow_id` int;--> statement-breakpoint
ALTER TABLE `documents` ADD `admission_checklist_item_id` int;--> statement-breakpoint
ALTER TABLE `documents` ADD `is_primary_evidence` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `lifecycle_status` varchar(20) DEFAULT 'stored' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `resetToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `resetTokenExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD `swimlane_dimension` varchar(40);--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD `is_template` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD `process_type` varchar(40);--> statement-breakpoint
ALTER TABLE `kanban_card_assignees` ADD `accepted_at` timestamp;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `entity_type` varchar(40);--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `entity_id` int;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `entered_list_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `global_status` varchar(20) DEFAULT 'todo' NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_lists` ADD `sla_days` int;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD CONSTRAINT `idx_admchk_workflow_code` UNIQUE(`workflow_id`,`code`);--> statement-breakpoint
ALTER TABLE `checklist_items` ADD CONSTRAINT `idx_employee_mirror` UNIQUE(`employeeId`,`sourceItemId`,`mirrorOrigin`);--> statement-breakpoint
ALTER TABLE `document_templates` ADD CONSTRAINT `document_templates_machine_key_unique` UNIQUE(`machine_key`);--> statement-breakpoint
CREATE INDEX `idx_docsign_document` ON `document_signatures` (`documentId`);--> statement-breakpoint
CREATE INDEX `idx_kauto_board` ON `kanban_automations` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_kauto_trigger` ON `kanban_automations` (`trigger_list_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_kca_card` ON `kanban_card_attachments` (`card_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_kcc_card_created` ON `kanban_card_comments` (`card_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_kch_card` ON `kanban_card_history` (`card_id`,`moved_at`);--> statement-breakpoint
CREATE INDEX `idx_kch_to_list` ON `kanban_card_history` (`to_list_id`);--> statement-breakpoint
CREATE INDEX `idx_mr_items_report` ON `mr_report_items` (`report_id`);--> statement-breakpoint
CREATE INDEX `idx_mr_reports_author` ON `mr_reports` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_mr_reports_status` ON `mr_reports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_op_clients_name` ON `operational_clients` (`name`);--> statement-breakpoint
CREATE INDEX `idx_op_clients_status` ON `operational_clients` (`status`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_routine` ON `operational_routine_occurrences` (`routine_id`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_client` ON `operational_routine_occurrences` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_due` ON `operational_routine_occurrences` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_card` ON `operational_routine_occurrences` (`card_id`);--> statement-breakpoint
CREATE INDEX `idx_op_occ_status` ON `operational_routine_occurrences` (`status`);--> statement-breakpoint
CREATE INDEX `idx_op_rem_occ` ON `operational_routine_reminders` (`occurrence_id`);--> statement-breakpoint
CREATE INDEX `idx_op_routines_client` ON `operational_routines` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_op_routines_active` ON `operational_routines` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_op_routines_assignee` ON `operational_routines` (`assignee_user_id`);--> statement-breakpoint
CREATE INDEX `idx_attachments_demand` ON `demand_attachments` (`demand_id`);--> statement-breakpoint
CREATE INDEX `idx_attachments_uploaded_by` ON `demand_attachments` (`uploaded_by_id`);--> statement-breakpoint
CREATE INDEX `idx_demands_requester` ON `demands` (`requester_id`);--> statement-breakpoint
CREATE INDEX `idx_demands_classifier` ON `demands` (`classifier_id`);--> statement-breakpoint
CREATE INDEX `idx_demands_executor` ON `demands` (`executor_id`);--> statement-breakpoint
CREATE INDEX `idx_demands_status` ON `demands` (`status`);--> statement-breakpoint
CREATE INDEX `idx_demands_category` ON `demands` (`category`);--> statement-breakpoint
CREATE INDEX `idx_demands_priority` ON `demands` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `idx_kc_entity` ON `kanban_cards` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_kc_entered_at` ON `kanban_cards` (`entered_list_at`);--> statement-breakpoint
CREATE INDEX `idx_kc_global_status` ON `kanban_cards` (`global_status`);