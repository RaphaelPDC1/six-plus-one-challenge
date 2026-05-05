CREATE TABLE `signup_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`source` varchar(120) NOT NULL DEFAULT 'landing',
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signup_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `signup_requests_email_unique` UNIQUE(`email`)
);
