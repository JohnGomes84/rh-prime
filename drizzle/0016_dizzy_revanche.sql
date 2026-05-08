CREATE TABLE `compliance_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('AFD','AFDT','ACJEF') NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`generated_by_id` int,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`record_count` int NOT NULL DEFAULT 0,
	`file_sha256` varchar(64),
	`file_bytes` int,
	`notes` text,
	CONSTRAINT `compliance_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `time_records` ADD `nsr` int;--> statement-breakpoint
ALTER TABLE `time_records` ADD `previous_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `time_records` ADD `record_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `compliance_exports` ADD CONSTRAINT `compliance_exports_generated_by_id_users_id_fk` FOREIGN KEY (`generated_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_compliance_type_period` ON `compliance_exports` (`type`,`period_start`);--> statement-breakpoint
CREATE INDEX `idx_time_nsr` ON `time_records` (`nsr`);