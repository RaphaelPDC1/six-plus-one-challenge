# Front-End Redesign Edit List

## Purpose

This edit list converts the locked poster/Claude artifact direction into an implementation plan. It is deliberately front-end-only. The data layer, schema, life-loss calculations, Monzo flow, WhatsApp persistence, Warden backend scaffolding, and existing tRPC contracts remain unchanged.

## Source of Truth

The visual reference is the user-provided Claude artifact and the participant poster aesthetic: black base, sharp geometry, heavy uppercase typography, warm gold accents, deep red danger/lives, green completion, purple Ghost Life, no rounded corners, no white cards, and no generic dashboard softness.

## Phase 1 — Global Visual System

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| `client/src/index.css` | Replace light/dashboard variables with poster palette and dark defaults | App opens on near-black base with readable white typography |
| `client/src/index.css` | Add utility classes for sharp cards, micro-labels, proof badges, segmented health bars, Warden pulse, completion rows, and gold active states | Reusable classes exist so screens do not hardcode inconsistent styling |
| `client/index.html` | Add or confirm a heavy sans-serif font strategy | Headings feel bold and poster-like, not default dashboard UI |
| Participant-facing components | Remove rounded-card styling and soft shadows | Cards, buttons, badges, nav, and health bars have sharp edges |

## Phase 2 — Participant Default Flow

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| `client/src/App.tsx` | Route authenticated participants to Today’s Log by default | Login lands on Today’s Log, not Overview or dashboard |
| Participant navigation | Establish bottom nav order: Log, Group, Board, Feed, plus secondary access to Rewards/Admin if already present | Log remains the first and primary tab |
| Existing route guards | Preserve auth behaviour while changing default landing destination only | No auth/backend contract changes |

## Phase 3 — Today’s Log Rebuild

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| Today/My Day page | Rebuild header with day count, Today’s Log title, gold underline/progress, and red segmented health bar | Lives are no longer shown as a number/pill/dots |
| Rule UI | Convert six rules into compact tappable sharp rows/cards | Each rule has label, proof badge, pending/completed state, and square checkbox |
| Rule expansion | Add inline detail expansion for workout, reflection, reading insight, and proof upload affordances where already supported | Interaction remains client-side and uses existing data submission contract |
| Completion states | Add green completion row, strikethrough, check animation, and optional haptic pulse | Ticking a rule feels satisfying and visually clear |
| Submit state | Gate gold submit button until all required rules are addressed | Disabled state is dark and unmistakable; enabled state is gold and high contrast |
| Streak/lives footer | Show current streak and health bar near the bottom of the flow | Stakes remain visible before submission |

## Phase 4 — Submit Reward Moment and Warden Presence

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| Today/My Day page | Add post-submit success state or overlay | Submit does not feel like a dead refresh |
| Points UI | Add odometer/ticking points animation based on returned totals where available | Points visibly move after successful log |
| Warden UI | Add persistent Warden card/banner with red left border, pulsing dot, and short message | Warden feels present without changing backend logic |
| Toasts/haptics | Add custom dark toast and `navigator.vibrate()` where supported | Tick, submit, milestone, and life-loss moments feel physical on mobile |

## Phase 5 — Group / Overview Restyle

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| Overview page | Replace dashboard cards with poster-style sections | No white/grey dashboard cards remain |
| Lives grid | Add compact participant cells with mini segmented health bars | Group stakes are visible at a glance |
| Warden card | Position Warden near the top with red left border and direct copy | Overview feels like live surveillance, not reporting |
| Insights/activity | Add compact marquee or horizontal feed for recent insights/activity | Group feels alive and in motion |

## Phase 6 — Leaderboard Rebuild

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| Leaderboard page | Replace static list with tappable competitive rows and/or graph treatment | Leaderboard feels alive, not like a table |
| Participant detail | Add mobile bottom drawer or sharp expanded panel | Tapping a participant reveals streak, points, lives, recent activity, and Ghost Life state |
| Rank states | Rank one receives gold callout; critical lives receive red treatment | Competition and risk are visually obvious |
| Chart mode | Add multi-line graph if the existing data supports time-series plotting | If time-series data is unavailable, do not fake it; use poster-style ranked rows until data exists |

## Phase 7 — Proof Feed, Rewards, Founder Consistency, and Validation

| File Area | Edit | Acceptance Criteria |
|---|---|---|
| Proof Feed | Restyle as evidence feed with sharp rows, rule badges, timestamps, and dark media blocks | Feed feels like receipts, not social cards |
| Rewards | Apply gold/premium reward treatment, preserving existing manual fulfillment logic | Rewards feel desirable without adding payment automation |
| Founder/Admin views | Keep admin functional, but align surface colors and typography | Admin remains usable and does not break operational tools |
| Tests | Update or add Vitest coverage for route/default flow and key UI states where practical | Existing tests still pass and new front-end expectations are covered |
| Validation | Run TypeScript, build, and test checks | Build is stable before checkpoint |

## Implementation Notes

The build should prioritize Today’s Log first because it is the emotional and functional core. Leaderboard graphing should only be implemented against real available data. If the current backend exposes only aggregate participant totals, the first pass should deliver the poster-style tappable leaderboard rows and bottom-sheet detail, then reserve the multi-line plotted graph for the moment time-series data is available.

## Approval Gate

Do not begin code implementation until the user confirms this edit list and the locked redesign brief are approved for the front-end pass.
