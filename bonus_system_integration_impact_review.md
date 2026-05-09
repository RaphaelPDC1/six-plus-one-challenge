# Bonus System Integration Impact Review

Author: **Manus AI**  
Date: 09 May 2026

## Executive Summary

I have still made **no behaviour changes** to the app. I expanded the review beyond the broken bonus-leader card and traced where bonus, boost, daily points, leaderboard ranking, rewards, Warden messaging, and participant insights depend on the same data. The important conclusion is that the fix cannot be treated as a small visual patch. The current app has several connected systems reading bonus information in different ways, and a partial fix would leave the user experience inconsistent.

The main defect is still the duplicated `boost_wins` data for **G LODGE**, but the wider integration issue is larger: stored boost wins are displayed as bonus points in the UI and Warden context, yet they do **not** appear to be added into `participants.totalPoints`. That means the app can say someone has bonus points while the main podium, reward eligibility, point gaps, and redemption logic may still be using only the participant total. If bonuses are intended to affect the challenge, the point ledger needs to be made explicit and consistent.

## Confirmed Dependency Map

The table below shows every major app surface that currently depends on daily points, named boost wins, or participant totals. This is why the eventual implementation should be done as one integrated pass instead of a narrow card fix.

| App area | Current dependency | Risk if only the bonus card is fixed | Recommended integrated fix |
|---|---|---|---|
| **Overview: Bonus leader** | Sums raw `boostWins` rows by participant and displays recent wins. | Duplicate rows keep inflating totals unless data and schema are fixed. | Deduplicate legacy data, enforce unique wins, and display canonical boost totals. |
| **Overview: Today’s bonus targets** | Uses `activeBoosts` and `todayBoostWins` to show claimed/open slots. | Old rotating slots may conflict with the new automatic bonus model. | Replace with the approved automatic boost set and show only relevant available/earned boosts. |
| **Board / leaderboard podium** | Ranks participants by `totalPoints` through participant insights. | If boost points remain separate, bonus wins will not affect board position even when UI calls them points. | Decide whether named bonuses are part of `totalPoints`; if yes, update scoring ledger and ranking. |
| **Full leaderboard rows** | Shows `p.totalPoints` plus a separate `+X boost` label. | Users may see a boost label but no matching change in their actual rank or reward progress. | Show one clear total and optionally a breakdown: daily points, checkpoint points, boost points. |
| **Rivalry cards and point gaps** | Uses `totalPoints` gaps, while also showing bonus-win counts. | A player can “win” bonuses without closing the gap if boosts are not included in totals. | Make gaps use the same canonical score as the podium. |
| **Rewards / redemption** | Uses `participant.totalPoints` to decide if a reward can be redeemed. | If boosts are real points but not in `totalPoints`, reward eligibility is understated. If boosts are just badges, the current wording is misleading. | Confirm whether boosts count toward rewards; then update reward eligibility and copy accordingly. |
| **My Day live points strip** | Uses frontend-only `calculateLiveTaskPoints`, which includes visible proof/insight/tracking extras. | The live preview can differ from backend `calculateDailyPoints`, creating confusion after submission. | Align live point preview with backend scoring or label it as an estimate with exact rules. |
| **Backend daily scoring** | `calculateDailyPoints` adds hidden small extras: full green, early completion before 14:00, no Ghost Life used, fifth streak milestone, and checkpoints. | These extras overlap with proposed named boosts and make the system feel opaque. | Remove or clearly separate hidden daily extras from named boost points. |
| **Boost award storage** | `boost_wins` stores boost rows but lacks a database uniqueness constraint. | Concurrent snapshot loading can still create duplicates. | Add unique key on challenge, user, day, and boost ID; make insertion race-safe. |
| **Snapshot loading** | App snapshot can trigger previous-day boost calculation. | Multiple users loading the app can attempt the same calculation. | Make calculation idempotent and ideally move award calculation to a controlled admin/warden flow. |
| **Warden state and messages** | Warden context reads boost wins, boost leader, unclaimed boosts, and boost trigger events. | Warden can talk about duplicated, removed, or renamed boosts. | Update Warden context and prompt copy to the new boost vocabulary and deduplicated totals. |
| **Tests** | Existing tests assert rotating three-boost behaviour and old UI copy. | Tests will either fail or protect the wrong behaviour after the redesign. | Replace tests with duplicate-prevention, canonical scoring, daily cap, and UI consistency tests. |

## Additional Data Finding: Boost Points Are Currently Separate From Main Points

A database read shows ten participants with their current `totalPoints` and stored boost rows. **G LODGE** currently has **40 participant total points** and **25 stored boost points across 5 stored boost rows**. **Nay** has **38 participant total points** and **10 stored boost points**, while several others have 38 participant points and no boost rows.

This matters because the main board and rewards use `participant.totalPoints`. If named boosts are supposed to change the challenge race, then stored boost points need to be included in the canonical scoring model. If named boosts are only recognition badges, then the UI should stop calling them bonus points that appear to affect the race. At the moment, the app is sitting between those two meanings.

| Decision area | Option A | Option B | My recommendation |
|---|---|---|---|
| **What boost points mean** | Boosts are real points that affect leaderboard and rewards. | Boosts are recognition badges shown separately from main scoring. | Use **real points**, because the app already says “bonus pts” and players will expect them to matter. |
| **Where totals should come from** | Keep using `participants.totalPoints` only. | Create a canonical total that includes daily points, checkpoint points, and boost points. | Use a canonical total or update `participants.totalPoints` consistently when boosts are awarded. |
| **How to show the breakdown** | Only show one total. | Show total plus a small breakdown. | Show **Total**, with a compact breakdown: Daily + Checkpoint + Boost. |
| **How rewards should work** | Rewards ignore boosts. | Rewards count boosts. | Count boosts if boosts are real points; otherwise rename them to badges. |

## Integrated Fix Scope Needed

The eventual build should be scoped as a connected scoring-system correction. It should not only clean duplicate rows and change the Overview card. The backend, database, UI, Warden context, and tests need to agree on the same definitions.

| Layer | Needed fix | Reason |
|---|---|---|
| **Database** | Delete duplicate `boost_wins` rows and add a uniqueness constraint for one boost per participant per day per boost ID. | This fixes the current broken duplication source and prevents recurrence. |
| **Awarding logic** | Make boost creation idempotent under repeated or simultaneous calls. | The current pre-insert check is helpful but not enough without a database constraint. |
| **Scoring model** | Decide and implement whether boosts are part of canonical `totalPoints`. | Leaderboard, reward eligibility, and point gaps must use the same score. |
| **Boost definitions** | Replace weak rotating boosts with approved automatic boosts. | The current system includes unclear or low-value rules such as Night Owl, Dead Heat, and Ghost Hunter. |
| **Daily point preview** | Align `calculateLiveTaskPoints` with backend scoring. | The My Day preview should not promise a point total that differs from the stored result. |
| **Overview UI** | Replace “three rotating slots” language with the new bonus model. | The UI should explain what is available today and what has already been earned. |
| **Board UI** | Make podium, full rows, gaps, and boost labels use the same score. | The board should not show bonus points separately while ignoring them in rank. |
| **Rewards UI** | Match reward eligibility to the canonical point total. | Users should understand whether boosts help unlock rewards. |
| **Warden logic** | Update boost context, boost leader, trigger events, and prompt wording. | The Warden should not mention removed boosts or duplicated wins. |
| **Tests** | Update backend and UI regression tests for the new canonical system. | This protects the duplicate fix and prevents future point mismatches. |

## Recommended Build Order After Approval

The safest implementation order is to fix the foundation first, then change the visible experience. First, clean the duplicate data and protect the database from future duplicates. Second, define the canonical score rule, especially whether boost points count toward leaderboards and rewards. Third, replace the old rotating boost model with the approved automatic boost set and daily cap. Fourth, update every dependent UI surface so Overview, Board, My Day, Rewards, and Warden messaging all speak the same language. Finally, add tests before saving a checkpoint.

| Step | Work package | Should be done before user-facing release? |
|---|---|---|
| 1 | Duplicate data cleanup and unique constraint. | Yes. |
| 2 | Idempotent boost-award logic. | Yes. |
| 3 | Canonical score decision and implementation. | Yes. |
| 4 | New automatic boost definitions and daily cap. | Yes. |
| 5 | Overview and Board copy/layout integration. | Yes. |
| 6 | My Day live-points alignment. | Yes. |
| 7 | Rewards eligibility/copy alignment. | Yes. |
| 8 | Warden context and message prompt updates. | Yes. |
| 9 | Regression tests for backend and UI dependencies. | Yes. |

## Decisions Needed Before Building

The most important decision is whether **bonus points should count as real points**. My recommendation is yes, because the current UI already presents them as points, not just achievements. If you agree, the implementation should ensure that the podium, full leaderboard, point gaps, rewards, Overview totals, Warden commentary, and participant profile sheets all use the same point source.

| Decision | Recommended answer | Why |
|---|---|---|
| Should bonus/boost points count toward the leaderboard? | **Yes.** | Players expect “+5 points” to move the board. |
| Should bonus/boost points count toward rewards? | **Yes, if they count toward leaderboard totals.** | Rewards should use the same point economy as the game. |
| Should the app keep three rotating boost slots? | **No.** | The current rotation is harder to understand and creates weak/odd bonuses. |
| Should old duplicates be cleaned? | **Yes.** | Otherwise G LODGE’s visible bonus history stays inflated. |
| Should the UI defensively deduplicate wins anyway? | **Yes.** | It protects legacy data and future edge cases. |
| Should Warden messaging be updated in the same build? | **Yes.** | Otherwise Warden may keep referencing removed or old boost concepts. |

## Bottom Line

The broken bonus leader is the visible symptom, but the deeper problem is that the app does not yet have one clear bonus-point contract. The next build should fix the duplicate records, prevent future duplicates, define whether bonuses are real scoring points, and update every dependent area at the same time. That includes Overview, Board, My Day live points, Rewards, Warden context, and tests. This will make the system feel integrated rather than patched.

## Approval Checklist for the Next Build

If approved, I would implement the next build as a single integrated scoring-system correction rather than a visual-only patch. The approved edit list would be as follows.

| Approval item | Proposed implementation |
|---|---|
| **Duplicate cleanup** | Remove exact duplicate `boost_wins` rows while preserving one legitimate win per participant, day, and boost. |
| **Duplicate prevention** | Add a database-level uniqueness rule and make boost award creation safe if two app snapshots calculate at the same time. |
| **Canonical scoring** | Treat approved boost points as real points that count toward leaderboard rank, point gaps, and rewards. |
| **Boost redesign** | Replace the old rotating three-bonus model with automatic boosts: Clean Sweep, Morning Proof, Bounce Back, Deep Work, Pressure Player, Streak Lock, and Mover. |
| **Boost cap** | Allow multiple boosts in a day, but cap named boost value at **+10 per participant per day**, excluding checkpoint bonuses. |
| **Removed weak bonuses** | Remove Night Owl, Dead Heat, and Ghost Hunter from point-scoring logic, and avoid rewarding late submissions or passive status. |
| **Overview integration** | Update bonus leader, available boosts, recent wins, and explanation copy so the section no longer duplicates or conflicts with the new rules. |
| **Board integration** | Update podium, full leaderboard rows, boost labels, and rival point gaps so they all use the same score definition. |
| **My Day integration** | Align live point previews with the backend scoring rules so submitted totals match what users saw before submitting. |
| **Rewards integration** | Make reward unlocks use the same canonical score as the leaderboard, unless you decide boosts should be badges only. |
| **Warden integration** | Update Warden context and message wording so it references the new bonuses and deduplicated totals only. |
| **Regression tests** | Add or update tests for duplicate prevention, boost caps, canonical totals, Overview display, and scoring consistency. |

My recommended approval is to proceed with this full list, because it prevents the app from showing one version of the scoring rules in Overview, another version on the Board, and another version in Rewards or Warden messages.
