CREATE TABLE `nfes_received` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nfeNumber` varchar(44) NOT NULL,
	`emitterCNPJ` varchar(14) NOT NULL,
	`emitterName` varchar(255) NOT NULL,
	`receiverCNPJ` varchar(14) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`issueDate` datetime NOT NULL,
	`dueDate` datetime,
	`description` text,
	`status` enum('received','processed','reconciled','rejected') NOT NULL DEFAULT 'received',
	`nfeType` enum('nfe','nfce','cte','mde') NOT NULL DEFAULT 'nfe',
	`xmlUrl` text,
	`focusNfeId` varchar(255),
	`linkedAccountId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfes_received_id` PRIMARY KEY(`id`),
	CONSTRAINT `nfes_received_nfeNumber_unique` UNIQUE(`nfeNumber`),
	CONSTRAINT `nfes_received_focusNfeId_unique` UNIQUE(`focusNfeId`)
);
--> statement-breakpoint
CREATE TABLE `pix_change_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`oldPixKey` text,
	`newPixKey` text NOT NULL,
	`status` enum('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
	`reviewedByUserId` int,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pix_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`filters` longtext NOT NULL,
	`sections` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleFunctionId` int NOT NULL,
	`scheduleId` int NOT NULL,
	`employeeId` int NOT NULL,
	`payValue` decimal(10,2) DEFAULT '0',
	`receiveValue` decimal(10,2) DEFAULT '0',
	`mealAllowance` decimal(10,2) DEFAULT '0',
	`voucher` decimal(10,2) DEFAULT '0',
	`bonus` decimal(10,2) DEFAULT '0',
	`paymentBatchId` int,
	`attendance_status` enum('presente','faltou','parcial') DEFAULT 'presente',
	`alloc_notes` text,
	`checkInTime` datetime,
	`checkOutTime` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schedule_functions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`jobFunctionId` int NOT NULL,
	`payValue` decimal(10,2) DEFAULT '0',
	`receiveValue` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schedule_functions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`module` varchar(50) NOT NULL,
	`canView` boolean NOT NULL DEFAULT false,
	`canCreate` boolean NOT NULL DEFAULT false,
	`canEdit` boolean NOT NULL DEFAULT false,
	`canDelete` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` datetime NOT NULL,
	`shiftId` int,
	`clientId` int NOT NULL,
	`clientUnitId` int,
	`status` enum('pendente','validado','cancelado') NOT NULL DEFAULT 'pendente',
	`totalPayValue` decimal(15,2) DEFAULT '0',
	`totalReceiveValue` decimal(15,2) DEFAULT '0',
	`totalPeople` int DEFAULT 0,
	`leaderId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','leader') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `employees` ADD `rg` varchar(30);--> statement-breakpoint
ALTER TABLE `employees` ADD `docFrontUrl` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `docBackUrl` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `registrationDate` datetime;--> statement-breakpoint
ALTER TABLE `employees` DROP COLUMN `admissionDate`;