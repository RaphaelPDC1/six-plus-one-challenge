# Bonus Leader Section and Bonus-Point Review

Author: **Manus AI**  
Date: 09 May 2026

## Executive Summary

I have not changed the app behaviour. I reviewed the current bonus leader section, the database bonus-win records, the backend boost-award safeguards, and the current points/bonus rules. The broken behaviour is real: the database currently contains duplicated bonus-win rows for **G LODGE** on **Day 3**, specifically **EARLY BIRD** and **GHOST HUNTER**, each recorded twice. Because the Overview bonus leader calculates totals directly from stored `boost_wins` rows, those duplicates inflate the displayed win list and bonus points.

The deeper issue is that the app is currently mixing three different concepts under the word **bonus**: daily completion extras, named rotating boosts, and frontend-only visible bonus signals. This makes some rewards feel weak, unclear, or duplicated. My recommendation is to pause implementation until we simplify the system into one clear owner-approved model.

## What Is Broken Right Now

The current Overview **Bonus leader** card uses every row in `boost_wins` for a participant, adds the points, then displays recent wins. It does not deduplicate repeated rows. The backend does check for an existing row before inserting a boost win, but the database schema does not enforce uniqueness, so near-simultaneous calculation calls can still create duplicate rows.

| Finding | Evidence | Practical effect |
|---|---|---|
| Duplicate rows exist in live data. | Day 3 has two `early_bird` rows and two `ghost_hunter` rows for user `90002`, participant **G LODGE**. | The bonus leader can show repeated wins and inflated points. |
| The `boost_wins` table has no unique constraint. | The schema defines fields for challenge, user, day, and boost ID, but only `id` is the primary key. | The code-level duplicate check is not enough under concurrent or repeated calls. |
| The Overview card sums raw rows. | The UI maps participant wins from `boostWins.filter(...)` and reduces `pointsAwarded`. | Duplicate rows become duplicate display entries and extra points. |
| Previous-day boost calculation runs during app snapshot loading. | The app calls prior-day boost calculation during snapshot generation. | Multiple users opening the app around the same time can potentially trigger the same calculation. |

> The immediate fix should include both **data cleanup** and a **real uniqueness guard**. Cleaning only the display would hide the issue, but the points would remain wrong behind the scenes.

## Current Bonus/Point System Review

The current point economy has a base daily completion model and a separate named boost model. A completed day gives **10 base points**, with small add-ons for a full 6/6 day, early completion before 14:00, not having used Ghost Life, streak milestones, and checkpoint days. Separately, named boosts currently award a flat **+5**.

| Current reward | Current value | Review | Recommendation |
|---|---:|---|---|
| Base passing day | 10 | Good anchor. Easy to understand. | Keep. |
| Full 6/6 green day | +3 | Useful, but not exciting enough if we want full completion to feel visibly special. | Increase or replace with a named automatic boost. |
| Early completion before 14:00 | +1 | Too weak and overlaps with Early Bird / Morning Proof concepts. | Remove from core daily points and make timing a named bonus only. |
| No Ghost Life used | +1 | Confusing because it rewards a status rather than behaviour today. | Remove or fold into a rarer named bonus. |
| Every fifth streak day | +2 | Too small for a meaningful streak milestone. | Replace with clearer streak bonuses such as Clean Sweep every third perfect day. |
| Checkpoint days | +50 / +100 / +150 / +250 | Big, clear, and meaningful. | Keep, but label separately from daily bonuses. |
| Rotating named boosts | +5 each | Clearer than hidden small extras, but current rotation and some rules feel arbitrary. | Replace with fewer automatic named bonuses that can be understood without explaining a rotation table. |

## Current Named Boost Rule Quality

The existing rotating boost list has strong ideas, but not all of them are suitable for a simple player-facing bonus system. Several are too conditional, too easy to misunderstand, or likely to award the same high-performing players repeatedly.

| Existing boost | Keep, change, or remove | Reason |
|---|---|---|
| FIRST UP | Change | Good competitive idea, but it can reward speed over quality and overlaps with Morning Proof. |
| STREAK KING | Change | Good, but excluding only the overall leader is not enough to stop repeated awards. |
| HARDEST DAY | Change | Exercise duration is useful, but without proof quality it can be gamed. |
| SURVIVOR | Keep concept | Good catch-up mechanic for people on low lives. Needs clear eligibility. |
| MOVER | Keep concept | Good anti-leader mechanic. It helps people outside the top group stay engaged. |
| DEPTH | Change | Good behaviour, but measuring text length alone is not ideal. |
| CLEAN SWEEP | Change | The current rule says only one player wins if exactly one person goes 6/6, which punishes days when several people perform well. |
| GHOST HUNTER | Remove | It rewards not having used Ghost Life, which is more status-based than action-based. |
| EARLY BIRD | Replace | Overlaps with Morning Proof and current daily early-completion bonus. |
| COMEBACK KID | Keep concept | Good emotional and competitive mechanic for recovery after a lost life. |
| PROOF MACHINE | Change | Good habit reward, but proof rate can favour low-volume players unless minimums are strict. |
| WARDEN'S PICK | Pause | Strong as manual flavour, weaker as an automatic points rule unless judging is transparent. |
| IRON WEEK | Keep concept | Clear milestone, but the reward should feel bigger than +5. |
| NIGHT OWL | Remove | It may encourage late submissions, which is probably not behaviour you want to reward. |
| DEAD HEAT | Remove or make non-point badge | It can award points to leaders for already being tied at the top, which may distort the leaderboard. |

## Recommended New Direction

I recommend moving from the current rotating three-bonus system to a smaller set of **automatic named boosts**. The system should reward behaviours that are good for the challenge: full completion, proof, recovery, consistency, and underdog movement. The rules should be visible, simple, and hard to game.

| Proposed boost | Recommended value | Trigger | Why it works |
|---|---:|---|---|
| **Clean Sweep** | +5 | A player completes all 6 rules in a day. | Rewards the best version of a day without punishing multiple strong players. |
| **Morning Proof** | +5 | Exercise proof is uploaded before 09:00. | Rewards early action and real proof, not just early tapping. |
| **Bounce Back** | +5 | A player passes the day immediately after losing a life or missing a day. | Keeps people engaged after failure. |
| **Deep Work** | +5 | Reflection and Read/Teach both meet a meaningful quality threshold. | Rewards substance, not only ticking boxes. |
| **Pressure Player** | +5 | A player on 1–2 lives completes a passing day. | Supports people under threat without giving free points. |
| **Streak Lock** | +5 or +10 | Every third consecutive full 6/6 day. | Makes consistency feel valuable without daily inflation. |
| **Mover** | +5 | Biggest weekly climb outside the top three. | Keeps the middle and bottom of the table alive. |

## Recommended Daily Cap and Stacking

Multiple bonuses should be allowed to trigger on the same day because a genuinely excellent day can deserve multiple recognitions. However, I recommend a **+10 daily bonus cap** from named boosts. This lets someone have a standout day without allowing bonus stacking to dominate the main challenge.

| Rule | Recommendation |
|---|---|
| Boost stacking | Allow multiple boosts on one day. |
| Daily cap | Cap named boost points at **+10 per participant per day**. |
| Core day points | Keep the passing-day base as the main scoring engine. |
| Checkpoint bonuses | Keep separate from daily cap. |
| Duplicate prevention | Enforce uniqueness at database and application levels. |

## Fix Plan Before Any Build

If approved, I would implement the fix in this order. This avoids building new bonus logic on top of broken existing rows.

| Step | Action | Why it matters |
|---|---|---|
| 1 | Clean the existing duplicate `boost_wins` rows, preserving one row per participant/day/boost. | Stops the current inflated leader display. |
| 2 | Add a unique database constraint on `challenge_id + user_id + day + boost_id`. | Prevents the duplicate from returning. |
| 3 | Make the award function idempotent under race conditions. | Prevents double insertion when multiple users load the app together. |
| 4 | Deduplicate defensively in the Overview card. | Protects the UI even if legacy data exists. |
| 5 | Replace the current rotating boosts with the approved automatic boost set. | Makes the bonus system easier to understand. |
| 6 | Update tests for duplicate prevention, bonus caps, and visible leader totals. | Keeps the bug from coming back. |

## Decisions Needed Before Building

I recommend confirming the following before I change code.

| Decision | My recommendation | Needs approval |
|---|---|---|
| Duplicate data cleanup | Delete exact duplicate rows for Day 3, keeping one `EARLY BIRD` and one `GHOST HUNTER` for G LODGE. | Yes. |
| Old rotating boost system | Replace it rather than tweak it. | Yes. |
| Daily named boost cap | Use **+10 per participant per day**. | Yes. |
| Clean Sweep | Award to every 6/6 day, with Streak Lock handling repeated perfect streaks. | Yes. |
| Morning Proof | Require actual exercise proof upload before 09:00. | Yes. |
| Warden’s Pick | Keep as a non-points badge or pause until judging is transparent. | Yes. |
| Night Owl / Dead Heat / Ghost Hunter | Remove from points bonuses. | Yes. |

## Bottom Line

The bonus leader section is broken mainly because duplicate bonus-win records exist and the database does not enforce uniqueness. The bonus system itself also needs simplifying, because the current app mixes hidden daily extras, rotating boosts, and frontend-only boost-style labels. I recommend fixing the duplicate foundation first, then replacing the current rotating three-bonus model with a cleaner automatic boost system that is easier for players to understand and harder to game.
