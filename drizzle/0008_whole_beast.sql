CREATE TABLE `digital_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`cpf` varchar(14) NOT NULL,
	`signerName` varchar(255) NOT NULL,
	`signerEmail` varchar(255) NOT NULL,
	`documentHash` varchar(512) NOT NULL,
	`signatureHash` varchar(512) NOT NULL,
	`signatureTimestamp` timestamp NOT NULL,
	`signatureMethod` enum('PIN','BIOMETRIC','CERTIFICATE') NOT NULL DEFAULT 'PIN',
	`ipAddress` varchar(45),
	`userAgent` text,
	`isValid` boolean NOT NULL DEFAULT true,
	`validationTimestamp` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `digital_signatures_id` PRIMARY KEY(`id`)
);
