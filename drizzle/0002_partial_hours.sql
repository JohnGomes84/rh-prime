-- Adicionar campos para controle de horas parciais
ALTER TABLE `schedule_allocations` 
ADD COLUMN `partial_hours` DECIMAL(5, 2) DEFAULT NULL COMMENT 'Horas trabalhadas (para status=parcial)',
ADD COLUMN `partial_pay_value` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Valor pago proporcional (para status=parcial)';
--> statement-breakpoint

-- Criar índice para melhorar performance de queries
CREATE INDEX `idx_schedule_allocations_employee_date` ON `schedule_allocations` (`employeeId`, `createdAt`);
