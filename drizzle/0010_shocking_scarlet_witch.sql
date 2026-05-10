CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`participantId` int,
	`pushEnabled` boolean NOT NULL DEFAULT false,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`morningIntent` boolean NOT NULL DEFAULT true,
	`afternoonProof` boolean NOT NULL DEFAULT true,
	`eveningDeadline` boolean NOT NULL DEFAULT true,
	`lifeRisk` boolean NOT NULL DEFAULT true,
	`streakRewards` boolean NOT NULL DEFAULT true,
	`wardenUpdates` boolean NOT NULL DEFAULT true,
	`quietHoursEnabled` boolean NOT NULL DEFAULT true,
	`quietHoursStart` varchar(5) NOT NULL DEFAULT '22:00',
	`quietHoursEnd` varchar(5) NOT NULL DEFAULT '07:00',
	`timezone` varchar(80) NOT NULL DEFAULT 'Europe/London',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `participant_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`participantId` int,
	`type` enum('morning_intent','afternoon_proof','evening_deadline','life_risk','streak_reward','warden_update','system') NOT NULL DEFAULT 'system',
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`actionUrl` text,
	`readAt` timestamp,
	`pushStatus` enum('not_attempted','sent','failed','skipped') NOT NULL DEFAULT 'not_attempted',
	`pushAttempts` int NOT NULL DEFAULT 0,
	`lastPushError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participant_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`participantId` int,
	`endpoint` text NOT NULL,
	`endpointHash` varchar(64) NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`userAgent` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpoint_hash_idx` UNIQUE(`endpointHash`)
);
