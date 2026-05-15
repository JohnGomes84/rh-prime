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
CREATE INDEX `idx_kca_card` ON `kanban_card_attachments` (`card_id`, `created_at`);
