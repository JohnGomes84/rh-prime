ALTER TABLE `notifications` ADD COLUMN `userId` int;--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`userId`, `isRead`);
