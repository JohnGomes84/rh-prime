-- Managerial Reports module
-- New tables: mr_reports, mr_report_items
-- Hand-written to match existing migration style (drizzle-kit meta snapshots are
-- stale repo-wide at 0023/0024, so `drizzle-kit generate` cannot be used safely here).

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
	CONSTRAINT `mr_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_mr_reports_period` ON `mr_reports` (`sector`, `cadence`, `period_ref`);--> statement-breakpoint
CREATE INDEX `idx_mr_reports_author` ON `mr_reports` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_mr_reports_status` ON `mr_reports` (`status`);--> statement-breakpoint
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
CREATE INDEX `idx_mr_items_report` ON `mr_report_items` (`report_id`);
