CREATE TABLE `proof_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyLogId` int NOT NULL,
	`participantId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proof_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proof_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dailyLogId` int NOT NULL,
	`participantId` int NOT NULL,
	`reaction` enum('fire','strong','inspired','accountable') NOT NULL DEFAULT 'fire',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proof_reactions_id` PRIMARY KEY(`id`)
);
