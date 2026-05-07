ALTER TABLE `contracts` ADD `scheduleType` enum('5x2','6x1','12x36','parcial_30h','parcial_25h','flexivel','intermitente') DEFAULT '5x2' NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `workDays` json DEFAULT ('[1,2,3,4,5]');--> statement-breakpoint
ALTER TABLE `contracts` ADD `startTime` varchar(5) DEFAULT '08:00';--> statement-breakpoint
ALTER TABLE `contracts` ADD `endTime` varchar(5) DEFAULT '17:00';--> statement-breakpoint
ALTER TABLE `contracts` ADD `lunchBreakMinutes` int DEFAULT 60;--> statement-breakpoint
ALTER TABLE `contracts` ADD `toleranceMinutes` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `contracts` ADD `hourBankEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `contracts` ADD `nightShiftEnabled` boolean DEFAULT false;