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
CREATE INDEX `idx_kcc_card_created` ON `kanban_card_comments` (`card_id`, `created_at`);
