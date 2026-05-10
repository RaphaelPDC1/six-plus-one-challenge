# Owner Approval Proposal: Boost System, Participant History, PWA Refresh, and Community-Care Updates

**Author:** Manus AI  
**Project:** 6+1 Four Lives Challenge  
**Status:** Proposal only; no build work has been started for these new requests.

## Executive Summary

This proposal confirms that the recent notification issue should remain separated from the next workstream: the app now distinguishes join/onboarding events from genuine life-loss events, while the remaining pending work concerns the **boost economy**, **participant history browsing**, **PWA refresh behaviour**, and **in-game community-care update pop-ups**. The safest next step is to approve one coordinated implementation pass rather than making isolated edits, because scoring, leaderboard rank, rewards eligibility, Warden copy, Overview cards, and tests all depend on the same point model.[1][2][3]

The recommendation is to proceed with a **canonical scoring model**: daily task points remain the base score, named boost wins are stored as separate audit rows, and all leaderboard/reward displays use one shared total of base points plus approved boost points. The proposed seven-boost model is mostly sound, but it should be treated as a controlled redesign with explicit duplicate cleanup, idempotent award creation, and user-facing copy that clearly says these are **named boosts**, not mysterious hidden bonuses.[1][2]

| Decision Area | Recommendation | Owner Decision Needed |
|---|---|---|
| Boost scoring economy | Use 5/6 completion as a pass and 6/6 as a premium green day; keep named boosts additive but capped daily. | Approve the scoring contract before implementation. |
| Seven named boosts | Keep the current seven-boost direction, with wording refinements and one caution on Mover. | Approve names/rules or request wording changes. |
| Duplicate bonus rows | Clean duplicate rows and preserve one legitimate participant/day/boost win. | Approve data cleanup when build starts. |
| Participant past-day viewing | Add a participant history drawer/calendar so users can inspect previous logs per participant. | Approve visibility rules for what all participants can see. |
| PWA swipe refresh | Add a safe pull-to-refresh gesture that refreshes snapshot data without forcing a full browser reload. | Approve lightweight in-app refresh first. |
| Patch-notes pop-up | Add a community-care update modal backed by release-note records and per-user acknowledgement. | Approve owner/admin-controlled update publishing. |

## Current Findings

The current shared boost contract already defines seven named boosts: **Clean Sweep**, **Morning Proof**, **Bounce Back**, **Deep Work**, **Pressure Player**, **Streak Lock**, and **Mover**. It also sets each named boost to five points and enforces a daily named-boost cap of ten points per participant in the evaluation routine.[1]

The backend already contains several important foundations. It has a database-level unique index for boost wins by challenge, user, day, and boost ID, and its insert helper checks for an existing row before inserting.[2] It also builds canonical participant totals by adding base participant points to boost point totals, then exposes those totals through the snapshot used by the UI.[3]

The remaining risk is not that the design has no foundation; the risk is that the app contains older naming and testing assumptions around “bonus” and “boost” behaviour. Some pending TODO items still refer to a rotating three-bonus model and stale tests reference older boost IDs, while the production shared boost module now uses the seven-boost model.[1][4] That means implementation should include a deliberate test refresh rather than only UI copy changes.

| Surface | Current State | Planning Implication |
|---|---|---|
| Shared boost rules | Seven named boosts are already represented in shared logic. | Owner can approve refinement rather than starting from scratch. |
| Database boost wins | Unique index exists for one win per challenge/user/day/boost. | Still needs duplicate cleanup if old rows already exist. |
| Snapshot scoring | Canonical totals are calculated in backend snapshot output. | UI must be audited so every display uses the same definition. |
| Overview and rival cards | They read participants, boost wins, and derived participant insights. | Copy and labels should be updated together to avoid conflicting terms. |
| Tests | Some boost tests appear stale against the current boost catalogue. | Regression tests must be updated as part of implementation. |
| Participant history | Participant insights already attach sorted `ownedLogs`. | UI can expose history without a major backend model change if permissions are agreed. |
| PWA runtime | Manifest and mobile shell exist, but no dedicated refresh/update system is present. | Add runtime behaviour and tests without disturbing the existing mobile layout. |

## Proposed Boost Economy

The point system should be described in the product as **base points plus named boost points**. The base points come from daily rule completion, while named boosts are transparent awards for specific behaviours that the platform can detect. This avoids the confusion created by the word “bonus” appearing in multiple places and makes it easier for participants to understand why the leaderboard moved.

| Component | Proposed Rule | Rationale | Risk Control |
|---|---|---|---|
| Daily pass | 5/6 rules qualifies as a green pass. | This keeps the challenge demanding while allowing one realistic miss. | Copy should say pass, not perfect. |
| Perfect day | 6/6 earns the strongest base-day outcome. | It rewards excellence without making perfection the only path. | Avoid stacking too many boost triggers on every 6/6 day. |
| Named boost | Each named boost is auditable and attached to a day. | Participants can understand the “why” behind extra points. | Store wins as separate records with source day and rule ID. |
| Daily named-boost cap | Cap named boosts at +10 per participant per day. | Prevents runaway days from dominating the leaderboard. | Exclude manual checkpoint/reward bonuses if those are later added separately. |
| Canonical total | Leaderboard, point gaps, rewards, and Warden all use base plus approved boost wins. | Stops the app showing different totals in different places. | Add tests for every display surface. |

The seven named boosts should be approved with a few wording and fairness notes. **Clean Sweep** is clear if it means a 6/6 day or milestone, but it should not be confused with the base perfect-day reward. **Morning Proof** is good because it is objective, but it depends on reliable upload timestamps. **Bounce Back** is motivating and supports retention, but it should require a genuine previous miss or life-loss pressure. **Deep Work** is valuable, but it should use clear minimum substance criteria rather than rewarding long filler. **Pressure Player** is emotionally strong and fits the “four lives” theme, but it should be phrased as recovery, not shame. **Streak Lock** is simple and motivating. **Mover** is useful for keeping mid-table players engaged, but it needs careful ranking math so current leaders do not farm it and new joiners are not unfairly over-rewarded.[1]

| Boost | Recommendation | Notes Before Build |
|---|---|---|
| Clean Sweep | Keep, but clarify whether it is every 3rd perfect day or each 6/6 day. | Current shared rule says every third consecutive perfect 6/6 day.[1] |
| Morning Proof | Keep. | Requires proof URL and submitted-before-09:00 logic.[1] |
| Bounce Back | Keep. | Should not trigger from onboarding or missing historical data for new players. |
| Deep Work | Keep with copy refinement. | Current rule uses combined reflection and Read/Teach character depth.[1] |
| Pressure Player | Keep with community-care wording. | Must feel like a comeback badge, not a public punishment. |
| Streak Lock | Keep. | Current rule pays on 7-day streak milestones.[1] |
| Mover | Keep, but test heavily. | Ranking movement can be fragile if joins, admin accounts, or sparse data are not handled. |

## Duplicate Bonus and Canonical Scoring Plan

When implementation is approved, the first build step should be a data-safe audit. The app should identify duplicate boost rows by `challengeId`, `userId`, `day`, and `boostId`, preserve the earliest or most complete legitimate row, and remove or ignore the rest only after owner approval. The existing unique index should prevent future duplicate rows, but historical rows may still need cleanup depending on what was created before the index or during earlier iterations.[2]

The second build step should be a single scoring contract used everywhere. Backend snapshot totals should remain the source of truth, and frontend calculations should not invent separate leaderboard totals. The Overview bonus leader, Board podium, rival point gaps, Rewards eligibility, My Day live preview, Warden context, and tests should all be updated together so participants do not see conflicting point numbers.[3]

| Implementation Dependency | Required Work |
|---|---|
| Database | Confirm unique index exists in the live database; clean duplicate historical rows if present. |
| Backend scoring | Keep `awardBoostWin` idempotent and preserve canonical score calculation. |
| Snapshot contract | Expose base points, boost points, and canonical total clearly if the UI needs to show the breakdown. |
| UI wording | Replace ambiguous “bonus” language with “named boosts” where appropriate. |
| Warden copy | Use boost names and source-event types consistently. |
| Tests | Cover duplicate prevention, daily cap, canonical totals, display consistency, and stale rotating-model removal. |

## Participant Past-Day Log Viewer

I understand the issue: participants cannot easily go back and view what was logged on past days for each participant. The current data model already has daily logs with day numbers, dates, rule fields, proof URLs, reflections, Read/Teach text, points, and submission timestamps.[5] The participant insight utility also already groups logs into each participant’s `ownedLogs`, sorted by day.[6] This means the likely missing piece is **navigation and presentation**, not a completely new logging model.

The recommended product shape is a participant profile/history drawer that opens from the Overview or Board. It should show a day-by-day timeline with rule completion, points, proof status, and reflection/Read-Teach excerpts. A compact filter should allow “All days,” “Missed days,” “Green days,” and “Proof days.” For privacy and community tone, the owner should decide whether every participant can see full reflection text for every other participant, or whether some fields should be owner/admin-only.

| History Feature | Recommended Behaviour |
|---|---|
| Entry point | Tap a participant from Overview or Board, then choose “History” or scroll to “Past days.” |
| Day selector | Show a 50-day grid or list with status colours and day numbers. |
| Log detail | Show rule checklist, points, proof link/thumbnail, submitted time, and safe text excerpts. |
| Permissions | Decide whether reflections and Read/Teach entries are public, participant-only, or admin-only. |
| Empty states | New players should show “No log yet for this day,” not a failure or life-loss implication. |

## PWA Swipe-Down Refresh

I also understand the PWA request: on mobile, the app should feel refreshable like a native app. The safest approach is an **in-app pull-to-refresh gesture** that refreshes challenge snapshot data and invalidates relevant queries, rather than forcing a browser-level reload. This preserves app state better and reduces the chance of breaking OAuth/session behaviour.

The implementation should detect a downward touch gesture only when the page is already scrolled to the top, show a small “Release to refresh” indicator, and trigger the same snapshot refetch mechanism used by the current app. It should also have a fallback refresh button for accessibility and for browsers where pull gestures conflict with the operating system or browser shell.

| PWA Refresh Requirement | Recommended Approach |
|---|---|
| Gesture | Pull down at top of app shell. |
| Action | Refetch/invalidate challenge snapshot and key queries. |
| Feedback | Show “Refreshing challenge…” then “Updated.” |
| Accessibility | Add a visible refresh button or command for keyboard/screen-reader users. |
| Risk | Avoid full page reload unless the app is truly stale or offline recovery requires it. |

## Community-Care Update Pop-Up / Patch Notes

I understand the third new requirement as follows: going forward, whenever the game receives an update, participants should see a community-caring pop-up explaining what changed, similar to patch notes. This should feel like an in-game announcement, not a developer changelog dumped into the UI.

The recommended system is an owner/admin-controlled release-note table with title, version label, summary, body, severity/type, published status, and publication time. A second acknowledgement table should record which user has seen each update, so the pop-up appears once per user per update and does not become another repeating-alert problem. This is the same lesson learned from the life-loss pop-up issue: alerts need stable event IDs and durable acknowledgement.

| Patch-Notes Element | Recommended Behaviour |
|---|---|
| Tone | “Community care” language: what changed, why it helps, and what players need to do. |
| Trigger | Show only published updates that the current user has not acknowledged. |
| Dismissal | Store acknowledgement per user/update so it appears once. |
| Access later | Add “Updates” or “What changed” link in the app menu/admin area. |
| Admin workflow | Owner drafts, previews, publishes, and optionally pins urgent updates. |

## Recommended Approval Package

I recommend approving this as one coordinated implementation package with four sections. First, complete the boost and scoring cleanup because it affects the core competitive experience. Second, add participant past-day history viewing because it improves transparency and helps players understand the board. Third, add PWA pull-to-refresh because it improves mobile usability. Fourth, add the community-care update system because future changes should be explained inside the game and acknowledged once.

| Package Item | Priority | Reason |
|---|---:|---|
| Boost duplicate cleanup and canonical scoring | 1 | Prevents leaderboard confusion and inconsistent reward eligibility. |
| Seven named boost UI/copy/test alignment | 2 | Makes the scoring model understandable to participants. |
| Participant past-day history viewer | 3 | Solves the current inability to inspect previous logs. |
| PWA pull-to-refresh | 4 | Improves mobile app feel without changing challenge rules. |
| Community-care patch-notes pop-up | 5 | Creates a safe channel for future game updates. |

## Owner Questions Before Build

Before implementation, I need approval on five decisions. First, should the public participant history show full reflection and Read/Teach text to everyone, or only summary/status information? Second, should **Clean Sweep** remain “every third consecutive perfect 6/6 day,” or should the name be used for any 6/6 day? Third, should checkpoint or owner-awarded bonuses ever exist outside the +10 named-boost cap, or should all extra points obey the same cap? Fourth, should community-care update pop-ups be visible to all users including admins, or should admins have a preview/draft mode? Fifth, should pull-to-refresh only refresh app data, or should there also be a “hard reload” option in settings for troubleshooting?

My recommendation is: public history should show rule status, points, proof, and short safe excerpts, while full reflections can be controlled later if privacy becomes a concern; **Clean Sweep** should stay as a milestone boost to avoid duplicating the perfect-day base reward; manual checkpoint bonuses should be separate from named boosts but clearly labelled; update pop-ups should show to all users after publishing while admins can preview drafts; and pull-to-refresh should refresh data first, not hard reload the whole app.

## References

[1]: ../shared/boostSystem.ts "Shared boost-system contract and seven named boost definitions"  
[2]: ../drizzle/schema.ts "Database schema for boost_wins unique award index"  
[3]: ../server/db.ts "Backend canonical score calculation and snapshot assembly"  
[4]: ../server/boostSystem.test.ts "Existing boost tests with stale rotating-model assumptions"  
[5]: ../drizzle/schema.ts "Database schema for daily_logs fields"  
[6]: ../client/src/lib/challengeInsights.ts "Participant insight utility grouping owned daily logs"
