CREATE TABLE `boost_wins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challenge_id` int NOT NULL,
	`user_id` int NOT NULL,
	`day` int NOT NULL,
	`boost_id` varchar(64) NOT NULL,
	`boost_name` varchar(140) NOT NULL,
	`boost_icon` varchar(10) NOT NULL,
	`points_awarded` int NOT NULL DEFAULT 5,
	`awarded_at` timestamp NOT NULL DEFAULT (now()),
	`warden_note` text,
	CONSTRAINT `boost_wins_id` PRIMARY KEY(`id`)
);
