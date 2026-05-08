CREATE TABLE `consent_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`employee_id` int,
	`consent_type` enum('data_processing','selfie_capture','geo_capture','marketing_communications','internal_policies','biometric','third_party_share') NOT NULL,
	`version` varchar(20) NOT NULL DEFAULT 'v1',
	`legal_basis` enum('consentimento','execucao_contrato','obrigacao_legal','interesse_legitimo','protecao_credito','tutela_saude') NOT NULL,
	`accepted` boolean NOT NULL,
	`accepted_at` timestamp,
	`revoked_at` timestamp,
	`ip_address` varchar(45),
	`user_agent` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `read_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_user_id` int,
	`resource` varchar(80) NOT NULL,
	`field` varchar(60) NOT NULL,
	`target_employee_id` int,
	`scope` enum('self','team','all') NOT NULL DEFAULT 'all',
	`ip_address` varchar(45),
	`metadata` json,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `read_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_consent_user_type` ON `consent_records` (`user_id`,`consent_type`);--> statement-breakpoint
CREATE INDEX `idx_readlog_actor` ON `read_audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `idx_readlog_target` ON `read_audit_logs` (`target_employee_id`);--> statement-breakpoint
CREATE INDEX `idx_readlog_resource` ON `read_audit_logs` (`resource`);