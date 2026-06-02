-- Kanban V2 Foundation
-- Extends existing kanban tables with V2 fields (swimlanes, SLA, entity binding)
-- Adds new tables: kanban_automations, kanban_card_history

-- ============================================================
-- ALTER kanban_boards: swimlanes + templates
-- ============================================================
ALTER TABLE `kanban_boards` ADD COLUMN `swimlane_dimension` varchar(40);--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD COLUMN `is_template` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `kanban_boards` ADD COLUMN `process_type` varchar(40);--> statement-breakpoint

-- ============================================================
-- ALTER kanban_lists: SLA per column
-- ============================================================
ALTER TABLE `kanban_lists` ADD COLUMN `sla_days` int;--> statement-breakpoint

-- ============================================================
-- ALTER kanban_cards: entity binding + SLA timestamp
-- ============================================================
ALTER TABLE `kanban_cards` ADD COLUMN `entity_type` varchar(40);--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD COLUMN `entity_id` int;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD COLUMN `entered_list_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint

-- ============================================================
-- CREATE kanban_automations
-- ============================================================
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
CREATE INDEX `idx_kauto_board` ON `kanban_automations` (`board_id`);--> statement-breakpoint
CREATE INDEX `idx_kauto_trigger` ON `kanban_automations` (`trigger_list_id`, `is_active`);--> statement-breakpoint

-- ============================================================
-- CREATE kanban_card_history
-- ============================================================
CREATE TABLE `kanban_card_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`from_list_id` int,
	`to_list_id` int NOT NULL,
	`user_id` int NOT NULL,
	`moved_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kanban_card_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_kch_card` FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_kch_card` ON `kanban_card_history` (`card_id`, `moved_at`);--> statement-breakpoint
CREATE INDEX `idx_kch_to_list` ON `kanban_card_history` (`to_list_id`);--> statement-breakpoint

-- ============================================================
-- INDEXES on extended columns
-- ============================================================
CREATE INDEX `idx_kc_entity` ON `kanban_cards` (`entity_type`, `entity_id`);--> statement-breakpoint
CREATE INDEX `idx_kc_entered_at` ON `kanban_cards` (`entered_list_at`);
