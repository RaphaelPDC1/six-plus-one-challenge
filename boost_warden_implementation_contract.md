# Boost System and Warden Mood Implementation Contract

This contract restates the upgraded-model implementation approach after re-reading `boost-system-spec.docx`. The spec is the source of truth. The implementation must be forward-only, additive, and safe for existing participant history.

## Non-Negotiable Data Safety Rules

The Boost System must never recalculate historical points, streaks, lives, payment events, or daily awards. Existing `daily_logs.pointsAwarded` values are final. Boost wins are stored separately in `boost_wins`, and total displayed points become the sum of existing daily award points plus boost points.

| Area | Required Contract |
|---|---|
| Historical daily logs | Read-only. Do not modify existing rows or point values. |
| Daily award formula | Unchanged. Base 10 plus existing bonuses remains intact. |
| Boost points | Additive only, stored in `boost_wins.points_awarded`, flat `+5`. |
| Rollback safety | Reverting boost display/logic should leave original progress untouched. |
| Rotation | Deterministic; no random boost selection. |

## Boost System Functional Contract

Each challenge day has three active boost slots generated from the deterministic 15-boost sequence. Conditional boosts may be skipped if their base condition cannot be met. Winners are calculated at end-of-day finalisation after normal lives and daily outcomes are already resolved. One player may win multiple boosts on the same day if they legitimately qualify, except where a boost-specific anti-gaming rule prevents it.

| Boost | Core Rule | Anti-Gaming / Guardrail |
|---|---|---|
| FIRST UP | First passing submission, `>=5` rules. | Cannot win `first_up` on consecutive days. |
| STREAK KING | Longest current streak among non-leaders. | Overall points rank `#1` is excluded. |
| HARDEST DAY | Longest exercise duration today. | Cannot win `hardest_day` on consecutive days. |
| SURVIVOR | Best daily score among players with `<=2` lives. | Safe players cannot win. |
| MOVER | Biggest seven-day rank climb outside top three. | Current top three excluded; minimum one rank climb. |
| DEPTH | Longest reflection plus Read & Teach text today. | Minimum 100 characters and cannot win in last three days. |
| CLEAN SWEEP | Exactly one player completes all six rules. | If multiple players go `6/6`, nobody wins. |
| GHOST HUNTER | Best daily score among players who have not used Ghost Life. | Ghost Life users excluded. |
| EARLY BIRD | First passing submission before 08:00. | Time locked. |
| COMEBACK KID | Most points since most recent life loss. | Requires at least one lost life. |
| PROOF MACHINE | Highest proof submission rate across completed days. | `100%` proof rate with fewer than three logged days excluded. |
| WARDEN'S PICK | Best reflection judged by Warden AI. | AI confidence must be `>=0.7`. |
| IRON WEEK | First day a player hits exactly seven consecutive green days. | One award per streak run. |
| NIGHT OWL | Last passing submission between 20:00 and 23:59. | Cannot also be same-day FIRST UP winner. |
| DEAD HEAT | Top tied total points at end of day. | Requires at least two players sharing exact total points. |

## UI Contract

The Board must show the Boost Key with three active slots, point value, anti-game copy, claimed state, and any winner identity. Player rows may show same-day boost badges and total boost points. The Overview must replace or supplement weak pace-bar information with richer boost and Warden Mood intelligence.

| Surface | Required Change |
|---|---|
| Board | Active Boost Key, claimed/open slots, anti-gaming explanation, row badges for today’s boost winners. |
| Overview | Warden Mood replaces the low-value pace bar as the primary qualitative insight. |
| Overview Stats | Boosts claimed today, top boost earner, player boost wins, and unclaimed boost alert. |
| Warden Messaging | Boost context supplied so messages reference boosts narratively, never using technical IDs. |

## Warden Mood Contract

Warden Mood is personalized per participant. It should interpret a participant’s own logs, reflections, Read & Teach text, proof activity, consistency, and effort trajectory. The output should feel like a Warden read of that person’s effort, not a generic score. If AI generation is unavailable or there is insufficient data, deterministic fallback moods must still render cleanly.

| Input Signal | Mood Interpretation Use |
|---|---|
| Daily rule completion | Consistency and follow-through. |
| Reflection text | Depth, honesty, and momentum. |
| Read & Teach text | Learning quality and ability to articulate insight. |
| Proof records | Accountability signal and possible proof pressure. |
| Streak/lives state | Risk, resilience, or dominance context. |
| Recent trend | Whether they are locking in, drifting, fighting back, or coasting. |

## Implementation Caution

The earlier partial state already added `boost_wins` to the schema and applied the database migration. The next phase must audit that current state before making further code changes. Do not rerun the same migration blindly.
