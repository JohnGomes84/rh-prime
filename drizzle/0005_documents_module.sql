CREATE TABLE `documents` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `documentType` varchar(50) NOT NULL,
  `purpose` varchar(50) NOT NULL,
  `retentionPolicy` varchar(30) NOT NULL,
  `visibility` enum('private','internal','public') NOT NULL DEFAULT 'internal',
  `status` enum('ativo','arquivado') NOT NULL DEFAULT 'ativo',
  `ownerUserId` int NOT NULL,
  `createdByUserId` int NOT NULL,
  `currentVersionId` varchar(36),
  `latestVersionNumber` int NOT NULL DEFAULT 1,
  `storageBackend` enum('local','s3') NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE TABLE `document_versions` (
  `id` varchar(36) NOT NULL,
  `documentId` varchar(36) NOT NULL,
  `versionNumber` int NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `mimeType` varchar(120) NOT NULL,
  `fileSize` int NOT NULL,
  `storageKey` varchar(500) NOT NULL,
  `fileHash` varchar(64) NOT NULL,
  `uploadedByUserId` int NOT NULL,
  `changeNotes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `document_versions_id` PRIMARY KEY(`id`),
  CONSTRAINT `uniq_document_version` UNIQUE(`documentId`,`versionNumber`),
  CONSTRAINT `uniq_document_storage_key` UNIQUE(`storageKey`)
);
--> statement-breakpoint

CREATE TABLE `document_audit_logs` (
  `id` varchar(36) NOT NULL,
  `documentId` varchar(36) NOT NULL,
  `targetVersionId` varchar(36),
  `action` varchar(80) NOT NULL,
  `userId` int NOT NULL,
  `ipAddress` varchar(64) NOT NULL,
  `userAgent` text,
  `correlationId` varchar(36) NOT NULL,
  `metadata` longtext,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `document_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE TABLE `document_tags` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  CONSTRAINT `document_tags_id` PRIMARY KEY(`id`),
  CONSTRAINT `document_tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint

CREATE TABLE `document_tag_links` (
  `documentId` varchar(36) NOT NULL,
  `tagId` varchar(36) NOT NULL,
  CONSTRAINT `uniq_document_tag` UNIQUE(`documentId`,`tagId`)
);
--> statement-breakpoint

CREATE TABLE `document_links` (
  `id` varchar(36) NOT NULL,
  `documentId` varchar(36) NOT NULL,
  `entityType` varchar(50) NOT NULL,
  `entityId` varchar(50) NOT NULL,
  `label` varchar(255),
  `createdByUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `document_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `uniq_document_link` UNIQUE(`documentId`,`entityType`,`entityId`)
);
--> statement-breakpoint

CREATE TABLE `storage_cleanup_jobs` (
  `id` varchar(36) NOT NULL,
  `storageKey` varchar(500) NOT NULL,
  `backend` enum('local','s3') NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `reason` varchar(120) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `lastError` text,
  `notBefore` timestamp NOT NULL DEFAULT (now()),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `storage_cleanup_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE INDEX `idx_document_versions_file_hash` ON `document_versions` (`fileHash`);
--> statement-breakpoint
CREATE INDEX `idx_document_links_entity` ON `document_links` (`entityType`, `entityId`);
--> statement-breakpoint
CREATE INDEX `idx_storage_cleanup_jobs_status_notBefore` ON `storage_cleanup_jobs` (`status`, `notBefore`);
