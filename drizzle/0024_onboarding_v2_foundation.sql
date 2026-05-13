ALTER TABLE `admission_workflows` ADD COLUMN `sync_status` varchar(20) NOT NULL DEFAULT 'NOT_SYNCED';--> statement-breakpoint
ALTER TABLE `admission_workflows` ADD COLUMN `catalog_version` varchar(20);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `code` varchar(100);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `kind` varchar(30) NOT NULL DEFAULT 'manual_validation';--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `status` varchar(30) NOT NULL DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `document_policy` varchar(30) NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `template_policy` varchar(30) NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `template_key` varchar(100);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `signature_policy` varchar(30) NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `review_policy` varchar(30) NOT NULL DEFAULT 'manual_review';--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `review_status` varchar(20);--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `reviewed_by_id` int;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `reviewed_at` timestamp;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `review_notes` text;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `waived_reason` text;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `waived_by_id` int;--> statement-breakpoint
ALTER TABLE `admission_checklist_items` ADD COLUMN `waived_at` timestamp;--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `origin` varchar(30);--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `admission_workflow_id` int;--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `admission_checklist_item_id` int;--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `is_primary_evidence` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `documents` ADD COLUMN `lifecycle_status` varchar(20) NOT NULL DEFAULT 'stored';--> statement-breakpoint
ALTER TABLE `document_templates` ADD COLUMN `machine_key` varchar(100);--> statement-breakpoint
ALTER TABLE `checklist_items` ADD COLUMN `sourceWorkflowId` int;--> statement-breakpoint
ALTER TABLE `checklist_items` ADD COLUMN `sourceItemId` int;--> statement-breakpoint
ALTER TABLE `checklist_items` ADD COLUMN `mirrorOrigin` varchar(50);--> statement-breakpoint
ALTER TABLE `checklist_items` ADD COLUMN `isEditable` boolean NOT NULL DEFAULT true;--> statement-breakpoint
CREATE TABLE `document_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`signatoryType` varchar(20) NOT NULL,
	`signatoryId` int NOT NULL,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(45),
	`signatureMethod` varchar(30) DEFAULT 'electronic',
	CONSTRAINT `document_signatures_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admchk_workflow_code` ON `admission_checklist_items` (`workflow_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_template_machine_key` ON `document_templates` (`machine_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_employee_mirror` ON `checklist_items` (`employeeId`,`sourceItemId`,`mirrorOrigin`);--> statement-breakpoint
CREATE INDEX `idx_docsign_document` ON `document_signatures` (`documentId`);--> statement-breakpoint
