-- Hardening de integridade do core financeiro/operacional
-- Observação: executar em homologação antes de produção.

-- 1) Impedir alocação duplicada do mesmo funcionário no mesmo planejamento
ALTER TABLE schedule_allocations
  ADD CONSTRAINT uq_schedule_alloc_employee UNIQUE (scheduleId, employeeId);
--> statement-breakpoint

-- 2) Impedir item duplicado do mesmo funcionário no mesmo lote
ALTER TABLE payment_batch_items
  ADD CONSTRAINT uq_payment_batch_employee UNIQUE (batchId, employeeId);
--> statement-breakpoint

-- 3) Melhorar consultas críticas
CREATE INDEX idx_schedule_allocations_scheduleId ON schedule_allocations (scheduleId);
--> statement-breakpoint
CREATE INDEX idx_schedule_allocations_employeeId ON schedule_allocations (employeeId);
--> statement-breakpoint
CREATE INDEX idx_payment_batch_items_batchId ON payment_batch_items (batchId);
--> statement-breakpoint
CREATE INDEX idx_pix_change_requests_employee_status ON pix_change_requests (employeeId, status);
--> statement-breakpoint

-- 4) Blindagens lógicas simples de valor
ALTER TABLE payment_batch_items
  ADD CONSTRAINT chk_payment_batch_items_daysWorked_non_negative CHECK (daysWorked >= 0);
--> statement-breakpoint

ALTER TABLE work_schedules
  ADD CONSTRAINT chk_work_schedules_totalPeople_non_negative CHECK (totalPeople >= 0);
