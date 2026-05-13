CREATE TABLE `admission_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`category` varchar(80) NOT NULL,
	`item_description` varchar(255) NOT NULL,
	`required` boolean NOT NULL DEFAULT true,
	`completed` boolean NOT NULL DEFAULT false,
	`document_url` varchar(500),
	`notes` text,
	`completed_at` timestamp,
	`completed_by_id` int,
	CONSTRAINT `admission_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admission_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidate_name` varchar(255) NOT NULL,
	`candidate_email` varchar(255),
	`candidate_cpf` varchar(14),
	`candidate_phone` varchar(20),
	`position_id` int,
	`department_id` int,
	`manager_id` int,
	`proposed_salary` decimal(10,2),
	`proposed_hire_date` date,
	`contract_type` enum('CLT','Estágio','Temporário','Experiência') NOT NULL DEFAULT 'CLT',
	`status` enum('DRAFT','DOCS_PENDING','VALIDATING','APPROVED','ACTIVE','REJECTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`current_step` varchar(60) DEFAULT 'dados_basicos',
	`notes` text,
	`created_by_id` int,
	`approved_by_id` int,
	`result_employee_id` int,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admission_workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`kind` enum('promocao','transferencia_dept','troca_gestor','ajuste_salarial','mudanca_jornada','mudanca_centro_custo','mudanca_cargo') NOT NULL,
	`from_value` text,
	`to_value` text,
	`effective_date` date NOT NULL,
	`reason` text,
	`approved_by_id` int,
	`created_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `termination_devolution_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`termination_id` int NOT NULL,
	`item_description` varchar(255) NOT NULL,
	`returned` boolean NOT NULL DEFAULT false,
	`returned_at` timestamp,
	`notes` text,
	CONSTRAINT `termination_devolution_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terminations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employee_id` int NOT NULL,
	`notice_date` date NOT NULL,
	`last_working_day` date NOT NULL,
	`reason` enum('sem_justa_causa','pedido_demissao','justa_causa','fim_contrato_determinado','acordo_mutuo','aposentadoria','obito') NOT NULL,
	`status` enum('INICIADO','DOCUMENTOS','DEVOLUCAO_EQUIP','CALCULO_VERBAS','APROVADO','FINALIZADO','CANCELADO') NOT NULL DEFAULT 'INICIADO',
	`notice_type` enum('trabalhado','indenizado','dispensado'),
	`total_verbas` decimal(10,2),
	`notes` text,
	`initiated_by_id` int,
	`approved_by_id` int,
	`initiated_at` timestamp NOT NULL DEFAULT (now()),
	`finalized_at` timestamp,
	CONSTRAINT `terminations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_admchk_workflow` ON `admission_checklist_items` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `idx_adm_status` ON `admission_workflows` (`status`);--> statement-breakpoint
CREATE INDEX `idx_adm_cpf` ON `admission_workflows` (`candidate_cpf`);--> statement-breakpoint
CREATE INDEX `idx_mov_employee` ON `employee_movements` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_mov_effective` ON `employee_movements` (`effective_date`);--> statement-breakpoint
CREATE INDEX `idx_termdev_termination` ON `termination_devolution_items` (`termination_id`);--> statement-breakpoint
CREATE INDEX `idx_term_employee` ON `terminations` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_term_status` ON `terminations` (`status`);