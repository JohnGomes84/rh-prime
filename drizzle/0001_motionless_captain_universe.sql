CREATE TABLE `absences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`absenceDate` date NOT NULL,
	`justified` boolean NOT NULL DEFAULT false,
	`reason` varchar(255),
	`documentUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `absences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userAction` varchar(100) NOT NULL,
	`tableName` varchar(100) NOT NULL,
	`recordId` int,
	`oldValues` json,
	`newValues` json,
	`performedBy` varchar(255),
	`performedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `benefits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`benefitType` enum('Vale Transporte','Vale Alimentação','Vale Refeição','Plano de Saúde','Plano Odontológico','Seguro de Vida','Outros') NOT NULL,
	`provider` varchar(255),
	`planName` varchar(255),
	`value` decimal(10,2),
	`employeeContribution` decimal(10,2),
	`optedOut` boolean DEFAULT false,
	`optOutDate` date,
	`startDate` date NOT NULL,
	`endDate` date,
	`status` enum('Ativo','Inativo','Suspenso') NOT NULL DEFAULT 'Ativo',
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `benefits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`checklistType` enum('Admissão','Rescisão') NOT NULL,
	`category` varchar(100) NOT NULL,
	`itemDescription` varchar(255) NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedDate` date,
	`completedBy` varchar(255),
	`documentId` int,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`positionId` int,
	`contractType` enum('CLT','Estágio','Temporário','Experiência') NOT NULL,
	`hireDate` date NOT NULL,
	`experienceEndDate` date,
	`experienceRenewed` boolean DEFAULT false,
	`terminationDate` date,
	`terminationReason` varchar(255),
	`workSchedule` varchar(100),
	`weeklyHours` decimal(4,2),
	`salary` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dependents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`relationship` enum('Cônjuge','Fil') NOT NULL,
	`birthDate` date,
	`cpf` varchar(14),
	`irDeduction` boolean DEFAULT false,
	`familySalary` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dependents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateType` enum('Termo de Responsabilidade','Declaração de Pendência','Ficha de EPI','Ordem de Serviço','Aviso de Férias','Outros') NOT NULL,
	`content` text NOT NULL,
	`placeholders` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `document_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`category` enum('Pessoal','Contratual','Saúde e Segurança','Benefícios','Termos','Treinamentos','Outros') NOT NULL,
	`documentName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileKey` varchar(500),
	`fileType` varchar(10),
	`fileSize` int,
	`expiryDate` date,
	`observations` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`positionId` int NOT NULL,
	`salary` decimal(10,2) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date,
	`changeReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`socialName` varchar(255),
	`cpf` varchar(14) NOT NULL,
	`rg` varchar(20),
	`birthDate` date,
	`gender` enum('M','F','Outro'),
	`maritalStatus` enum('Solteiro','Casado','Divorciado','Viúvo','União Estável'),
	`nationality` varchar(100),
	`educationLevel` varchar(100),
	`email` varchar(255),
	`phone` varchar(20),
	`addressStreet` varchar(255),
	`addressNumber` varchar(20),
	`addressComplement` varchar(100),
	`addressNeighborhood` varchar(100),
	`addressCity` varchar(100),
	`addressState` varchar(2),
	`addressZip` varchar(10),
	`ctpsNumber` varchar(20),
	`ctpsSeries` varchar(10),
	`pisPasep` varchar(20),
	`voterTitle` varchar(20),
	`militaryCert` varchar(20),
	`cnhNumber` varchar(20),
	`cnhCategory` varchar(5),
	`cnhExpiry` date,
	`bankName` varchar(100),
	`bankAgency` varchar(20),
	`bankAccount` varchar(30),
	`pixKey` varchar(255),
	`photoUrl` varchar(500),
	`status` enum('Ativo','Inativo','Afastado','Férias') NOT NULL DEFAULT 'Ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_cpf_unique` UNIQUE(`cpf`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentType` varchar(100) NOT NULL,
	`brand` varchar(100),
	`model` varchar(255),
	`serialNumber` varchar(100),
	`imei` varchar(50),
	`patrimonyCode` varchar(50),
	`status` enum('Disponível','Emprestado','Em Manutenção','Baixado') NOT NULL DEFAULT 'Disponível',
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`employeeId` int NOT NULL,
	`loanDate` date NOT NULL,
	`returnDate` date,
	`conditionAtLoan` varchar(255),
	`conditionAtReturn` varchar(255),
	`termDocumentId` int,
	`status` enum('Ativo','Devolvido') NOT NULL DEFAULT 'Ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`type` enum('Nacional','Estadual','Municipal') NOT NULL DEFAULT 'Nacional',
	`recurring` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `holidays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('Médico','INSS','Maternidade','Paternidade','Acidente de Trabalho','Outros') NOT NULL,
	`startDate` date NOT NULL,
	`expectedReturnDate` date,
	`actualReturnDate` date,
	`inssProtocol` varchar(50),
	`observations` text,
	`documentUrl` varchar(500),
	`status` enum('Ativo','Encerrado') NOT NULL DEFAULT 'Ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`examType` enum('Admissional','Periódico','Demissional','Retorno','Mudança de Função') NOT NULL,
	`examDate` date NOT NULL,
	`expiryDate` date NOT NULL,
	`result` enum('Apto','Inapto','Apto com Restrições'),
	`doctorName` varchar(255),
	`crm` varchar(20),
	`clinicName` varchar(255),
	`observations` text,
	`documentUrl` varchar(500),
	`status` enum('Válido','Vencido','Próximo do Vencimento') NOT NULL DEFAULT 'Válido',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('Férias','ASO','Banco de Horas','Contrato Experiência','Treinamento','Documento','EPI','Geral') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('Info','Aviso','Crítico') NOT NULL DEFAULT 'Info',
	`relatedEmployeeId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`dueDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`cboCode` varchar(10),
	`description` text,
	`department` varchar(100),
	`baseSalary` decimal(10,2),
	`hazardLevel` enum('Nenhum','Insalubridade','Periculosidade') DEFAULT 'Nenhum',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ppe_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`ppeDescription` varchar(255) NOT NULL,
	`caNumber` varchar(20),
	`quantity` int NOT NULL,
	`deliveryDate` date NOT NULL,
	`returnDate` date,
	`reason` varchar(255),
	`employeeSignature` boolean DEFAULT false,
	`documentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ppe_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`positionId` int,
	`nrReference` varchar(20),
	`activities` text,
	`risks` text,
	`recommendedPpe` text,
	`preventiveMeasures` text,
	`requiredTrainings` text,
	`issueDate` date NOT NULL,
	`employeeSignature` boolean DEFAULT false,
	`documentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` varchar(255),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `time_bank` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`referenceMonth` date NOT NULL,
	`hoursBalance` decimal(6,2) NOT NULL,
	`expiryDate` date NOT NULL,
	`observations` text,
	`status` enum('Ativo','Compensado','Vencido','Pago') NOT NULL DEFAULT 'Ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `time_bank_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`trainingName` varchar(255) NOT NULL,
	`nrReference` varchar(20),
	`trainingDate` date NOT NULL,
	`expiryDate` date,
	`hours` decimal(4,2),
	`provider` varchar(255),
	`certificateUrl` varchar(500),
	`status` enum('Válido','Vencido','Próximo do Vencimento') NOT NULL DEFAULT 'Válido',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vacation_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vacationId` int NOT NULL,
	`employeeId` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`days` int NOT NULL,
	`isPecuniaryAllowance` boolean DEFAULT false,
	`pecuniaryDays` int DEFAULT 0,
	`noticeDate` date,
	`status` enum('Agendada','Em Gozo','Concluída','Cancelada') NOT NULL DEFAULT 'Agendada',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vacation_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vacations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`acquisitionStart` date NOT NULL,
	`acquisitionEnd` date NOT NULL,
	`concessionLimit` date NOT NULL,
	`daysEntitled` int NOT NULL DEFAULT 30,
	`daysTaken` int NOT NULL DEFAULT 0,
	`status` enum('Pendente','Agendada','Em Gozo','Concluída','Vencida') NOT NULL DEFAULT 'Pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacations_id` PRIMARY KEY(`id`)
);
