CREATE TABLE `kanban_board_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('admin','editor','viewer') NOT NULL DEFAULT 'editor',
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_board_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`color` varchar(16) DEFAULT '#6366f1',
	`owner_id` int NOT NULL,
	`visibility` enum('private','team','public') NOT NULL DEFAULT 'private',
	`department_id` int,
	`archived` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_card_assignees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`user_id` int NOT NULL,
	`employee_id` int,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_card_assignees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_card_labels` (
	`card_id` int NOT NULL,
	`label_id` int NOT NULL,
	CONSTRAINT `kanban_card_labels_card_id_label_id_pk` PRIMARY KEY(`card_id`,`label_id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`list_id` int NOT NULL,
	`board_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`position` double NOT NULL,
	`due_date` date,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`created_by` int NOT NULL,
	`archived` boolean NOT NULL DEFAULT false,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`content` varchar(255) NOT NULL,
	`is_done` boolean NOT NULL DEFAULT false,
	`position` double NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_labels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board_id` int NOT NULL,
	`name` varchar(40) NOT NULL,
	`color` varchar(16) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_labels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board_id` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`position` double NOT NULL,
	`archived` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kanban_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_kbm_board_user` ON `kanban_board_members` (`board_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_kbm_user` ON `kanban_board_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_kb_owner` ON `kanban_boards` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_kb_dept` ON `kanban_boards` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_kca_card` ON `kanban_card_assignees` (`card_id`);--> statement-breakpoint
CREATE INDEX `idx_kca_user` ON `kanban_card_assignees` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_kca_card_user` ON `kanban_card_assignees` (`card_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_kclbl_label` ON `kanban_card_labels` (`label_id`);--> statement-breakpoint
CREATE INDEX `idx_kc_list` ON `kanban_cards` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_kc_board` ON `kanban_cards` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_kc_list_pos` ON `kanban_cards` (`list_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_kci_card` ON `kanban_checklist_items` (`card_id`);--> statement-breakpoint
CREATE INDEX `idx_kci_card_pos` ON `kanban_checklist_items` (`card_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_klbl_board` ON `kanban_labels` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_kl_board` ON `kanban_lists` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_kl_board_pos` ON `kanban_lists` (`board_id`,`position`);
