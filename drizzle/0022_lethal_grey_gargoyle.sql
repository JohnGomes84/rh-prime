ALTER TABLE `time_records` ADD `selfie_url` varchar(500);--> statement-breakpoint
ALTER TABLE `time_records` ADD `geofence_status` enum('within','outside','no_geo') DEFAULT 'no_geo';--> statement-breakpoint
ALTER TABLE `time_records` ADD `device_fingerprint` varchar(120);