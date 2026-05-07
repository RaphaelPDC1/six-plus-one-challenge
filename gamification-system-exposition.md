# 6+1 4 Lives Challenge: Gamification System Exposition

**Author:** Manus AI  
**Project:** 6+1 4 Lives Challenge  
**Scope:** Current app implementation and product logic

## Executive Overview

The **6+1 4 Lives Challenge** is built around a deliberately high-pressure behaviour-change loop. The player is not merely asked to complete habits; they are placed into a 50-day competitive discipline system where each day must be defended. The core design combines **daily rule completion**, **limited lives**, **financial consequence**, **visible points**, **streak pressure**, **public accountability**, **reward redemption**, and an AI-powered **Warden** layer that turns raw behaviour data into social narrative.

At the centre of the system is a simple pass condition: each participant has **six daily rules**, and a day is treated as complete when at least **five of the six** are satisfied before the relevant deadline. This creates a useful tension. The challenge is strict enough to demand real effort, but it includes one margin of flexibility so that a single imperfect area does not automatically destroy the day. The player is therefore pushed to build consistency rather than chase unrealistic perfection.

> The game is intentionally designed around controlled pressure: participants have enough flexibility to survive normal life, but not enough flexibility to coast.

The system uses several overlapping feedback mechanisms. **Lives** create fear of loss, **points** create progress and reward seeking, **streaks** create continuity pressure, **leaderboards** create comparison, **proof uploads** create credibility, **reflections and Read & Teach entries** create depth, and the **Warden** converts participant behaviour into group-facing commentary. Together, these mechanics make the app feel less like a habit tracker and more like a challenge arena.

## Core Game Loop

The primary loop is daily. Each participant opens the **My Day** experience, logs progress against the rules, watches the Live Points Strip update, and submits the day once enough work is complete. The app records the submission, awards points if the day passes, updates streaks, and later finalises missed days by removing lives and creating payment events.

| Stage | Player Action | System Response | Gamification Purpose |
|---|---|---|---|
| Start of day | Participant opens My Day | Current day, lives, streak, progress, and rule status are shown | Establishes urgency and clarity |
| During the day | Participant completes rules | Live rule progress and visible points update | Provides immediate feedback |
| Submission | Participant submits the day | The app checks whether at least 5 of 6 rules are complete | Converts effort into a win/loss outcome |
| Completion | Day passes | Points are awarded, streak increases, days complete increases | Reinforces consistency |
| Missed deadline | Day fails or is absent | A life is lost, streak resets, £25 payment event is created | Adds consequence and accountability |
| Ongoing challenge | Participant compares with others | Board status, leaderboard rank, risk labels, and Warden commentary update | Creates social pressure and competitive narrative |

The loop is effective because it has both **instant feedback** and **delayed consequence**. A participant can see progress immediately as they log tasks, but the true penalty for neglect appears when the day is finalised. This stops the challenge from feeling abstract: every missed day has visible, financial, and social consequences.

## The Six Daily Rules

The system tracks six rules. A participant must complete at least five to pass the day. The rules are implemented as boolean or derived states, meaning some are direct toggles while others become complete only when supporting details are entered.

| Rule | Implementation Meaning | Completion Signal | Behaviour Being Reinforced |
|---|---|---|---|
| **No Alcohol** | Participant confirms no alcohol | Boolean tick | Restraint and identity control |
| **Clean Eating** | Participant confirms clean eating, optionally with a note | Boolean tick | Nutritional discipline |
| **30m Exercise** | Participant logs at least 30 minutes and provides an exercise type | Duration plus text | Physical output and proof of effort |
| **Daily Reflection** | Participant writes reflection text | Non-empty text | Self-awareness and emotional processing |
| **Read & Teach** | Participant writes teaching or learning text | Non-empty text | Learning, articulation, and contribution |
| **Track Everything** | Participant confirms complete tracking | Boolean tick | Honesty, measurement, and self-audit |

The five-out-of-six model is important. It avoids making the system brittle while still preserving pressure. If the challenge required six out of six every day, one unavoidable miss could feel catastrophic. If it required fewer than five, the system would become too easy to game. The threshold therefore creates a strong but survivable standard.

## Pass, Fail, and Deadline Logic

A day is considered complete when the participant has completed at least **five** rules and, where deadline information is available, has submitted on time. If the participant does not complete enough rules, the day remains incomplete. If the previous day becomes overdue and is still incomplete, the system finalises that miss.

When a day is finalised as missed, the app does three things. First, it reduces the participant’s lives by one, never allowing lives to fall below zero. Second, it resets the current streak to zero. Third, it creates a **£25 payment event** with the participant’s Monzo link or the default challenge payment link. It also creates a Warden message stating that a life has been lost and includes the payment request.

| Outcome | Condition | System Effect | Player Meaning |
|---|---|---|---|
| **Green day** | At least 5 of 6 rules completed on time | Points awarded, streak increases, days complete increases | The participant defended the day |
| **Partial draft** | Progress exists but day is not yet passable before deadline | Draft state remains available | The participant can still recover |
| **Missed day** | Previous day is overdue and incomplete | Life lost, streak reset, £25 payment event created | The participant pays for the miss |
| **Already completed day** | A day was previously marked complete | Points are not duplicated | Prevents farming the same day repeatedly |

This structure gives the challenge a strong integrity layer. The app does not simply celebrate completions; it also actively detects silence, incompletion, and lateness.

## Lives: The Main Failure Currency

Lives are the emotional backbone of the challenge. Every participant begins with **four lives**, stored as `livesRemaining`. Lives are capped between zero and four in the UI logic, and the life-loss function applies a floor at zero so that repeated failures cannot create negative lives.

A life is lost when an overdue day is finalised as incomplete. This loss is not purely symbolic. It is attached to a **£25 payment event**, which turns the failure into a concrete cost. The app also records the reason for the loss, including the missed rules where available. This means the failure is explainable rather than arbitrary.

| Lives Remaining | Psychological State | Product Tone |
|---:|---|---|
| **4** | Safe but accountable | Stable |
| **3** | First warning | Stable |
| **2** | Pressure rising | Danger |
| **1** | Critical survival mode | Critical |
| **0** | No buffer left | Maximum consequence |

The lives system works because it turns the challenge into a survival game. Points can motivate advancement, but lives create loss aversion. Participants are not only trying to climb; they are trying not to fall.

## Points: The Progress and Reward Currency

Points are awarded when a participant completes a valid day. The backend daily award starts from a base value and adds bonuses for quality, timing, restraint, streak milestones, and challenge checkpoints.

The standard backend formula awards **10 base points** for a completed day. It then adds optional bonuses: **+3** for a full six-out-of-six green day, **+1** for early completion before 14:00, **+1** for not having used Ghost Life, **+2** for each five-day streak milestone, and checkpoint bonuses on specific challenge days.

| Points Element | Value | Trigger | Design Purpose |
|---|---:|---|---|
| Base completion | **+10** | Day passes | Makes every green day meaningful |
| Full green bonus | **+3** | All 6 rules complete | Rewards excellence beyond the pass threshold |
| Early completion bonus | **+1** | Submitted before 14:00 | Encourages early action, not late scrambling |
| Restraint bonus | **+1** | Ghost Life has not been used | Rewards clean survival |
| Streak milestone bonus | **+2** | Next streak lands on a multiple of 5 | Reinforces continuity |
| Day 10 checkpoint | **+50** | Completed Day 10 | Creates early milestone excitement |
| Day 25 checkpoint | **+100** | Completed Day 25 | Reinforces mid-challenge commitment |
| Day 40 checkpoint | **+150** | Completed Day 40 | Builds late-stage momentum |
| Day 50 checkpoint | **+250** | Completed final day | Creates a strong finish incentive |

The front-end also exposes a **Live Points Strip**, which acts as an immediate preview of value while the participant is filling in My Day. This visible total is not exactly the same as the backend award formula. Instead, it is a motivational interface calculation: each completed rule contributes visible points, and additional visible boosts appear for passing the threshold, going full green, uploading proof, adding meaningful insight, and tracking everything.

| Live Points Strip Element | Value | Trigger | Why It Exists |
|---|---:|---|---|
| Rule points | **+2 per completed rule** | Each rule ticked | Makes partial progress feel alive |
| Pass bonus | **+4** | At least 5 rules complete | Makes the pass threshold feel rewarding |
| Full green bonus | **+3** | 6 of 6 rules complete | Encourages completion beyond minimum |
| Proof bonus | **+1** | Exercise proof exists | Encourages credible evidence |
| Insight bonus | **+1** | Reflection or teaching has depth | Rewards substance, not only ticking boxes |
| Tracking bonus | **+1** | Track Everything complete | Reinforces honest measurement |

This dual points system is valuable because it separates **motivational feedback** from **final scoring authority**. The strip helps the user feel progress in the moment, while the backend preserves the canonical award recorded in the database.

## Streaks and Consistency

The app tracks both **current streak** and **longest streak**. When a participant newly completes a day, the current streak increases by one and longest streak is updated if the new streak exceeds the previous record. When a life is lost, current streak resets to zero.

Streaks serve two roles. First, they create personal continuity pressure: a participant who has built a run has something to protect. Second, streaks feed into scoring and board logic. A five-day streak milestone creates an extra points bonus, while board status lines can highlight strong runs such as several green days in a row.

| Streak Mechanic | System Behaviour | Psychological Effect |
|---|---|---|
| Current streak increases | New completed day | Builds momentum |
| Longest streak updates | Current streak beats previous best | Creates a personal record |
| Streak resets | Life lost / missed finalised day | Makes misses feel costly |
| Five-day milestone bonus | Next streak is divisible by 5 | Adds mini-goals inside the 50 days |

The streak system is deliberately tied to failure. If streaks only increased but did not reset, they would become a passive stat. By resetting on a life loss, they become a fragile asset.

## Ghost Life and Double-Down Recovery

Ghost Life is the recovery mechanic. It exists to prevent one failure from permanently weakening a participant while still making recovery difficult enough to feel earned. A participant can only restore a life if they have lost one, have not already used Ghost Life, and complete the required recovery condition.

The current code contains two related concepts. The eligibility function describes Ghost Life as non-repeatable and dependent on a **Double-Down day**. Another helper defines a stricter earning signal: Ghost Life can be earned when the participant has not used it, has fewer than four lives, completes at least **60 minutes of exercise**, and provides at least **two insights**. Together, these point to the intended design: Ghost Life is not a free undo; it is a demanding redemption day.

| Ghost Life Requirement | Meaning |
|---|---|
| Not already used | Ghost Life is a one-time recovery mechanism |
| Fewer than 4 lives | It only restores a lost life; it cannot exceed the starting cap |
| Double-Down complete | Recovery requires a meaningful over-performance day |
| 60 minutes exercise signal | Recovery should require extra physical effort |
| Two insight signal | Recovery should require extra reflective or teaching depth |

The product value of Ghost Life is that it creates a **redemption arc**. A participant who fails is not simply punished; they are given one dramatic route back. This makes the game more emotionally engaging because failure can become a story rather than an endpoint.

## Leaderboard, Board Status, and Competitive Ranking

The leaderboard ranks participants primarily by **total points**. Ties are broken by movement score and then consistency score. This prevents the board from being a flat points table and gives recent effort and reliability some influence when participants are close.

The app also calculates a rich participant insight model. Each participant has a completion rate, submit rate, proof rate, point velocity, recent point gain, completed rules today, tasks left today, pass tasks left, lives lost, risk score, mover score, consistency score, boost score, comparison line, and board status.

| Competitive Metric | What It Measures | How It Shapes Behaviour |
|---|---|---|
| **Total points** | Accumulated challenge performance | Drives long-term competition |
| **Mover score** | Recent point gain, recent passes, today’s progress, streak | Rewards active momentum |
| **Consistency score** | Pass rate, streak, proof reliability, lives preserved | Rewards stable discipline |
| **Risk score** | Tasks left, no log, lives lost, recent misses, urgency by time of day | Exposes who is slipping |
| **Boost score** | Today’s award, full green day, proof, insight, recent lift | Highlights positive surges |
| **Point velocity** | Recent points per day | Shows speed of progress |
| **Proof rate** | Share of logs with exercise proof | Rewards credibility |

The board status language translates these numbers into readable narrative tags. For example, a participant with one life remaining is marked as critical. Someone who has passed today with a meaningful streak is described as being on a strong run. Someone with no log and a high risk score is placed in danger territory.

This is a crucial design choice. Raw stats are informative, but status language creates emotion. The app does not only say “riskScore: 70”; it says the participant is in the **Red zone** or **Danger zone**. That makes the game easier to understand and harder to ignore.

## Proof, Reflection, and Read & Teach as Anti-Cheating and Depth Mechanics

The challenge uses proof and writing to stop the system from becoming a checkbox game. Exercise can include proof via a URL, and reflections or Read & Teach entries are analysed by length or content presence for insight signals. These mechanics do not replace the core pass/fail rules, but they influence visible boosts, board insights, Warden commentary, and proof reliability.

| Depth Mechanic | Basic Function | Gamification Role |
|---|---|---|
| **Exercise proof** | Captures proof URL | Builds trust and raises proof rate |
| **Reflection text** | Captures daily self-audit | Creates emotional and behavioural insight |
| **Reflection shared flag** | Marks reflection as shareable | Feeds group learning and Warden commentary |
| **Read & Teach text** | Captures learning or teaching | Turns consumption into contribution |
| **Insight detection** | Looks for meaningful reflection or teaching text | Rewards depth and gives the Warden material |

These mechanics are important because they move the challenge from behaviour tracking into identity formation. A participant is not just saying they exercised or ate cleanly; they are producing evidence, explaining lessons, and contributing to the group narrative.

## Rewards and Redemption

The reward system converts points into tangible prizes. The active reward catalogue currently includes three seeded rewards: **Puresport Mystery Item** at 150 points, **6plus1 T-Shirt** at 300 points, and **Group Meal Unlocked** at 500 points. A participant can create a redemption request only if their total points meet or exceed the reward cost.

| Reward | Cost | Category | Design Function |
|---|---:|---|---|
| **Puresport Mystery Item** | 150 points | Puresport | Early tangible reward |
| **6plus1 T-Shirt** | 300 points | 6plus1 | Mid-tier identity reward |
| **Group Meal Unlocked** | 500 points | 6plus1 | High-tier social reward |

Redemption requests are stored with delivery name, delivery address, checkpoint earned, and a status of pending, fulfilled, or cancelled. This gives the system an operational path from points to fulfilment while preserving founder/admin review.

The reward ladder is intentionally sparse. Instead of overwhelming the participant with a shop, it gives a few clear milestone objects. This keeps attention on the challenge itself rather than turning the app into a store.

## The Warden Layer

The Warden is the narrative engine. It observes participant activity, life losses, milestones, reflections, Read & Teach entries, exercise logs, WhatsApp chat history, risk changes, returns after silence, shared themes, proof behaviour, and group completion patterns. It then decides whether a message is deserved.

The Warden is designed not to feel like a scheduled notification. Its system prompt explicitly frames it as a presence that has been watching the day and only speaks when the data has earned a message. It can react to life losses, major leaderboard shifts, critical risk, streak milestones, challenge checkpoints, unusually honest writing, personal bests, Ghost Life signals, or an unusually strong group day.

| Warden Trigger Type | Example | Social Effect |
|---|---|---|
| Life lost | Participant misses deadline and loses a life | Public accountability |
| Streak milestone | 7, 14, or 21-day run | Public recognition |
| Challenge milestone | Day 10, 25, 40, or 50 | Shared challenge drama |
| Sharp reflection | Honest or useful writing | Reinforces depth |
| Personal best | Exercise duration or rule best | Celebrates effort |
| Silent return | Participant returns after several quiet days | Reinforces comeback story |
| Ghost Life signal | Double-Down recovery behaviour | Frames redemption |
| Group clean day | No life losses across the group | Creates collective pride |

The Warden turns data into myth. Without it, the game would be a set of stats. With it, the challenge becomes a watched environment where actions can become stories.

## Financial Consequence and Accountability

The financial penalty system is simple but powerful. When a life is lost, the app creates a payment event for **£25**. The event has a status: pending, received, or waived. Founder/admin tooling can mark payment as received or waived.

This mechanic changes the stakes. Missing a day is not just a red mark on a dashboard; it produces an actual obligation. The Monzo payment link provides a direct route from failure to settlement. The Warden message can also surface the life loss and payment request into the group accountability layer.

| Payment State | Meaning |
|---|---|
| **Pending** | Life was lost and payment is owed |
| **Received** | Payment has been confirmed |
| **Waived** | Payment has been excused by founder/admin |

The design relies on social and financial friction rather than hard enforcement alone. The app records the payment state, but the real power is that the group and founder can see who has lost lives and whether the consequence has been handled.

## Participant Journey Over 50 Days

The challenge is structured as a 50-day journey. The system uses checkpoint bonuses at Days 10, 25, 40, and 50 to prevent the experience from feeling like a flat grind. These checkpoints create arcs inside the larger challenge: early proof, mid-challenge resilience, late-stage commitment, and final completion.

| Phase | Days | Player Experience | Design Emphasis |
|---|---:|---|---|
| On-ramp | 1–10 | Learning the rules and surviving the first rhythm | Habit formation and first checkpoint |
| Build phase | 11–25 | Streaks and points begin separating participants | Consistency and leaderboard movement |
| Pressure phase | 26–40 | Lives, missed days, and fatigue become more visible | Risk, recovery, and identity |
| Finish phase | 41–50 | Final checkpoint and strongest bonus | Completion, legacy, and group story |

The checkpoint bonuses are large enough to matter. A participant who hits a milestone receives a clear scoring surge, which can shift leaderboard position and re-energise motivation.

## Why the System Works

The gamification system is effective because it uses multiple motivational levers at once, each serving a different psychological function.

| Motivational Lever | Mechanic | Psychological Function |
|---|---|---|
| Loss aversion | Four lives and £25 payment events | Makes failure feel costly |
| Immediate feedback | Live Points Strip and rule progress | Keeps daily logging satisfying |
| Mastery | Full green bonuses and streaks | Rewards excellence and skill-building |
| Social comparison | Leaderboard and board status | Encourages competitive effort |
| Accountability | Proof, Warden messages, payment status | Makes claims harder to fake |
| Redemption | Ghost Life / Double-Down day | Allows comeback without removing consequence |
| Narrative | Warden commentary and milestones | Turns data into story |
| Tangible reward | Reward catalogue and redemptions | Converts effort into prizes |

The strongest aspect of the system is that it does not depend on one mechanic alone. If a participant is not motivated by points, they may still care about lives. If they do not care about rewards, they may care about public Warden commentary. If they fall behind, Ghost Life gives them a comeback path. If they are doing well, streaks, checkpoints, and the leaderboard give them reasons to keep pushing.

## Product Design Assessment

The current system has a strong foundation because its rules are understandable, its consequences are meaningful, and its social layer gives the challenge personality. The five-out-of-six threshold is particularly good because it creates a fair standard: the participant can miss one thing, but cannot drift through the day with minimal effort.

The most important distinction to preserve is the separation between **daily survival** and **daily excellence**. Survival is passing five rules. Excellence is six rules, early submission, proof, insight, preserved Ghost Life, streak milestones, and checkpoint completion. This separation lets new or struggling participants keep playing while giving high performers additional reasons to push.

The Warden layer should remain selective. If it speaks too often, it will become noise. If it speaks only when behaviour deserves it, it becomes a meaningful presence. The same principle applies to rewards: the catalogue should stay focused enough that the challenge remains about discipline, not shopping.

## Recommended Clarifications for Future Iteration

There are a few areas worth tightening in future product iterations. First, the app should clearly explain the difference between **Live Points Strip points** and the final backend points awarded after submission. The Live Points Strip is an in-the-moment progress motivator, while the final score is the canonical challenge award. Making that distinction explicit will prevent confusion.

Second, Ghost Life should be described consistently in the UI. The implementation points to a **Double-Down recovery day**, with signals such as 60 minutes of exercise and at least two insights. The app should present one clear rule set so participants know exactly how to earn it.

Third, the financial consequence should be visible but carefully worded. The £25 penalty is one of the most powerful accountability mechanics, but the app should keep it clear, factual, and tied to missed rules rather than shaming language in the core UI. The Warden can carry more of the dramatic tone.

## Concise System Definition

> The 6+1 4 Lives Challenge is a 50-day discipline game where each participant must complete at least five of six daily rules to defend the day. Completed days award points, extend streaks, and unlock reward progress. Missed overdue days cost one of four lives, reset the streak, and create a £25 payment event. A one-time Ghost Life recovery mechanic allows a participant to earn back a lost life through an over-performance day. The leaderboard, risk scores, proof signals, written insights, rewards, and Warden commentary turn individual behaviour into a competitive social accountability system.

## Source Notes

This exposition is grounded in the current project implementation, especially the following files: `server/challengeLogic.ts`, `server/db.ts`, `client/src/lib/challengeUi.ts`, `client/src/lib/challengeInsights.ts`, `server/warden/messageGenerator.ts`, and `drizzle/schema.ts`.
