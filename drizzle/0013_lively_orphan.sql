CREATE TABLE `candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobOpeningId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(20),
	`resumeUrl` varchar(500),
	`linkedinUrl` varchar(500),
	`stage` enum('Triagem','Entrevista RH','Entrevista Tecnica','Entrevista Final','Aprovado','Reprovado','Desistiu') NOT NULL DEFAULT 'Triagem',
	`notes` text,
	`rating` int,
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_openings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`department` varchar(100),
	`positionId` int,
	`description` text,
	`requirements` text,
	`salaryMin` decimal(10,2),
	`salaryMax` decimal(10,2),
	`vacancies` int NOT NULL DEFAULT 1,
	`status` enum('Aberta','Em Andamento','Fechada','Cancelada') NOT NULL DEFAULT 'Aberta',
	`priority` enum('Baixa','Normal','Alta','Urgente') NOT NULL DEFAULT 'Normal',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`createdBy` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_openings_id` PRIMARY KEY(`id`)
);
