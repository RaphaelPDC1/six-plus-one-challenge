ALTER TABLE `participants` ADD `profilePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `profilePhotoKey` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `primaryGoal` varchar(220);--> statement-breakpoint
ALTER TABLE `participants` ADD `biggestObstacle` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `trainingLevel` varchar(80);--> statement-breakpoint
ALTER TABLE `participants` ADD `motivationStyle` varchar(80);--> statement-breakpoint
ALTER TABLE `participants` ADD `onboardingCompleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `displayName` varchar(140);--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `primaryGoal` varchar(220);--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `biggestObstacle` text;--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `trainingLevel` varchar(80);--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `motivationStyle` varchar(80);--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `profilePhotoUrl` text;--> statement-breakpoint
ALTER TABLE `signup_requests` ADD `profilePhotoKey` text;