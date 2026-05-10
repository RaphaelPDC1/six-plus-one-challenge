ALTER TABLE `release_notes` MODIFY COLUMN `category` enum('edit','community_care','rules','rewards','technical') NOT NULL DEFAULT 'edit';
