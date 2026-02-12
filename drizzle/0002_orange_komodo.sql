CREATE TABLE `dashboard_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`visibleMetrics` text NOT NULL,
	`metricsOrder` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pcmso` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`cnpj` varchar(18) NOT NULL,
	`issueDate` date NOT NULL,
	`expiryDate` date NOT NULL,
	`documentUrl` varchar(500),
	`fileKey` varchar(500),
	`status` enum('Válido','Vencido','Próximo do Vencimento') NOT NULL DEFAULT 'Válido',
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pcmso_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pgr` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`cnpj` varchar(18) NOT NULL,
	`issueDate` date NOT NULL,
	`expiryDate` date NOT NULL,
	`documentUrl` varchar(500),
	`fileKey` varchar(500),
	`status` enum('Válido','Vencido','Próximo do Vencimento') NOT NULL DEFAULT 'Válido',
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pgr_id` PRIMARY KEY(`id`)
);
