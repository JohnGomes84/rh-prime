-- Kanban V2: status global cross-board
-- Permite agrupar cards em colunas Todo/InProgress/Done independente do board

ALTER TABLE `kanban_cards` ADD COLUMN `global_status` varchar(20) NOT NULL DEFAULT 'todo';--> statement-breakpoint
CREATE INDEX `idx_kc_global_status` ON `kanban_cards` (`global_status`);
