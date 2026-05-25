ALTER TABLE `participants` ADD `status` enum('active','dispute','withdrawn') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `disputeReason` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `disputeStartedAt` timestamp;