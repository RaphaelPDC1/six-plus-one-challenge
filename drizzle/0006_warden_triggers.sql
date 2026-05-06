-- Phase 2: Warden Triggers Table
-- Tracks when immediate trigger events fire to prevent duplicate messages

CREATE TABLE IF NOT EXISTS `warden_triggers` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `trigger_type` varchar(140) NOT NULL,
  `participant_id` int,
  `day_number` int,
  `last_fired_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_trigger_type_date` (`trigger_type`, `last_fired_at`),
  INDEX `idx_participant_trigger` (`participant_id`, `trigger_type`)
);

-- Trigger types:
-- life_lost: A participant lost a life
-- milestone_day_10: Day 10 reached
-- milestone_day_25: Day 25 reached
-- milestone_day_40: Day 40 reached
-- milestone_day_50: Day 50 reached
-- ghost_life_double_down: Ghost Life Double-Down completed
-- streak_7_days: 7-day streak milestone
-- streak_14_days: 14-day streak milestone
-- streak_21_days: 21-day streak milestone
-- participant_to_1_life: Participant dropped to 1 life
-- no_log_3_days: Participant hasn't logged for 3+ days
