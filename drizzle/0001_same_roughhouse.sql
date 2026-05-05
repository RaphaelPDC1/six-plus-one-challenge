CREATE TABLE `daily_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`dayNumber` int NOT NULL,
	`logDate` date NOT NULL,
	`noAlcohol` boolean NOT NULL DEFAULT false,
	`cleanEating` boolean NOT NULL DEFAULT false,
	`cleanEatingNote` text,
	`exerciseDone` boolean NOT NULL DEFAULT false,
	`exerciseDuration` int NOT NULL DEFAULT 0,
	`exerciseType` varchar(140),
	`exerciseProofUrl` text,
	`reflectionDone` boolean NOT NULL DEFAULT false,
	`reflectionText` text,
	`reflectionShared` boolean NOT NULL DEFAULT false,
	`readTeachDone` boolean NOT NULL DEFAULT false,
	`readTeachText` text,
	`dayComplete` boolean NOT NULL DEFAULT false,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(140) NOT NULL,
	`avatarInitials` varchar(4) NOT NULL,
	`whatsappName` varchar(140),
	`monzoPaymentLink` text,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`daysComplete` int NOT NULL DEFAULT 0,
	`livesRemaining` int NOT NULL DEFAULT 4,
	`ghostLifeUsed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`dailyLogId` int,
	`amountPence` int NOT NULL DEFAULT 2500,
	`paymentLink` text,
	`reason` text NOT NULL,
	`status` enum('pending','received','waived') NOT NULL DEFAULT 'pending',
	`confirmedByUserId` int,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `redemption_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`rewardId` int NOT NULL,
	`deliveryName` varchar(180) NOT NULL,
	`deliveryAddress` text NOT NULL,
	`checkpointEarned` varchar(80) NOT NULL,
	`status` enum('pending','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
	`fulfilledByUserId` int,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `redemption_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_catalogue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`pointsCost` int NOT NULL,
	`category` varchar(120) NOT NULL DEFAULT 'Pure Sport',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_catalogue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warden_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mode` enum('surveillance','commentary','on_ramp','system') NOT NULL,
	`content` text NOT NULL,
	`sourceEvent` varchar(140),
	`postedToWhatsapp` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warden_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_chat_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` varchar(180) NOT NULL,
	`senderName` varchar(180),
	`groupId` varchar(180) NOT NULL,
	`messageText` text NOT NULL,
	`messageTimestamp` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_chat_history_id` PRIMARY KEY(`id`)
);
