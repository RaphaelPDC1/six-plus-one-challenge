CREATE TABLE `release_note_acknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`releaseNoteId` int NOT NULL,
	`userId` int NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `release_note_acknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `release_note_ack_unique_idx` UNIQUE(`releaseNoteId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `release_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`versionLabel` varchar(80) NOT NULL,
	`category` enum('community_care','rules','rewards','technical') NOT NULL DEFAULT 'community_care',
	`active` boolean NOT NULL DEFAULT true,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `release_notes_id` PRIMARY KEY(`id`)
);
