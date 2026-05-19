CREATE TABLE `admin_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`adminName` varchar(140) NOT NULL,
	`action` enum('restore_life','deduct_life','mark_payment_received','mark_payment_pending','adjust_points','approve_signup','reject_signup','fulfill_reward','cancel_reward','other') NOT NULL,
	`targetParticipantId` int,
	`targetParticipantName` varchar(140),
	`previousValue` text,
	`newValue` text,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bug_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`participantId` int,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`screenshotUrl` text,
	`screenshotKey` text,
	`affectedPage` varchar(80),
	`status` enum('open','acknowledged','investigating','resolved','wontfix') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`assignedToUserId` int,
	`resolution` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bug_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`participantId` int,
	`eventType` varchar(80) NOT NULL,
	`action` varchar(140) NOT NULL,
	`severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`context` text,
	`stackTrace` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `error_logs_id` PRIMARY KEY(`id`)
);
