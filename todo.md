# Project TODO

## Completed v1 Build (Baseline)
- [x] Implement participant and founder/admin role-based access using the existing authenticated user model
- [x] Add challenge database tables for participant profiles, daily logs, payment events, reward catalogue items, redemption requests, WhatsApp chat history, and Warden message logs
- [x] Build the private My Day daily logging flow scoped only to the logged-in participant
- [x] Implement all six daily rules with required inputs and midnight completion logic
- [x] Implement the 4 Lives system where any missed rule can trigger a life loss
- [x] Add in-app £25 Monzo payment-link prompt scaffolding when a life is lost
- [x] Implement the non-repeatable Ghost Life mechanic with Double-Down day eligibility
- [x] Implement points, streaks, days-complete, and checkpoint awards for Day 10, Day 25, Day 40, and Day 50
- [x] Build the four-tab gamified tracker: Overview, Leaderboard, Proof Feed, and My Day
- [x] Ensure Overview shows group progress graph, all participant lives grid, and activity feed
- [x] Ensure Leaderboard ranks participants by points and streaks
- [x] Ensure Proof Feed shows public insights and submissions while respecting private reflections
- [x] Ensure My Day incomplete state and personal stats are visible only to the logged-in participant
- [x] Build the Pure Sport rewards catalogue and redemption request flow
- [x] Build founder/admin dashboard for participant visibility, lives, payment statuses, pending redemptions, fulfillment controls, and Warden logs
- [x] Add WhatsApp webhook receiver endpoint scaffolding that persists incoming group messages to the database
- [x] Add Warden AI commentator scaffolding with Surveillance, Commentary, and On-ramp modes
- [x] Enforce hard cap of 3 unprompted Warden messages per day
- [x] Add server-side tests for core challenge logic and access controls
- [x] Validate the app build, type checks, tests, and running preview before delivery
- [x] Save a final checkpoint after the completed first build
- [x] Deliver summary, limitations, and next steps to the user
- [x] Remove Stripe from v1 scope and use a fixed Monzo payment request link for life-loss penalties
- [x] Log every life-loss payment obligation in the database regardless of whether payment has been manually confirmed
- [x] Add founder/admin controls to manually mark Monzo penalty payments as received
- [x] Ensure Warden life-loss messaging references the Monzo payment request link rather than Stripe
- [x] Wire Track Everything through the daily log form, schema, persistence, completion evaluation, and life-loss/payment tests
- [x] Implement Ghost Life end-to-end with participant mutation, one-time persistence, life restoration, and UI controls
- [x] Add Vitest coverage for founder/admin-only procedures and protected access controls

## Front-End Redesign (v2) — Preserve All Backend Logic
- [x] Phase 1: Visual System & Layout — update CSS palette, set participant default landing to My Day, update navigation tabs
- [x] Phase 2: Today's Log Screen — rebuild rule cards, add segmented health bar, add streak display, add gated Submit button, integrate animated checkbox, add proof upload affordances, add haptics
- [x] Phase 3: Post-Submit Moment — add poster-style post-submit toast moment, add completion feedback, add haptic feedback
- [x] Phase 4: Overview Screen — restyle group stats, multi-line graph, lives grid, proof feed, and activity feed in the poster aesthetic
- [x] Phase 5: Leaderboard — replace static dashboard styling with tappable poster-style leaderboard rows and expandable participant stats
- [x] Phase 6: Warden Presence — add persistent Warden card and Sonner feedback notifications
- [x] Phase 7: Polish & Validation — validate dark theme contrast, responsive layout, haptics support, Vitest, production build, and preview status
- [x] Create implementation edit list with specific file changes and component integrations
- [x] Validate all animations use spring physics or smooth easing (no linear)
- [x] Validate dark theme consistency and gold/red accent usage across all screens
- [x] Validate text contrast ratios (4.5:1 minimum)
- [ ] Test on mobile devices (iPhone and Android) for haptics and responsive design
- [x] Save checkpoint after front-end redesign completion
- [x] Lock the Claude artifact and participant poster mockup as the primary visual reference for v2: sharp edges, no border radius, heavy uppercase typography, near-black base, warm gold accents, deep red danger states, green completion states, purple Ghost Life states, and compact no-waste spacing
- [x] Ensure the v2 front-end implementation follows the poster DNA rather than generic dashboard, SaaS, Framer marketplace, or soft-card styling
- [x] Treat pasted_content_5 as the closest app-screen mockup reference while adapting it to the existing React/Tailwind/tRPC app without backend changes
- [x] Approved implementation: execute the front-end-only poster/Claude artifact redesign while preserving backend, schema, life-loss logic, Monzo flow, WhatsApp persistence, and Warden scaffolding
- [x] Implement the redesign from REDESIGN_BRIEF.md and FRONTEND_REDESIGN_EDIT_LIST.md, prioritizing Today’s Log as the participant default landing experience

## Refinement Pass (v3) — Transitions, Haptics, Signup Approval, Journal Component
- [ ] Save a safety checkpoint for the completed v2 redesign before making v3 changes
- [ ] Inspect the provided Framer journal/testimonial reference and translate its interaction style into native React/Tailwind without importing marketplace components
- [ ] Add fine-grained transitions for tab changes, rule expansion, sheet open/close, CTA hover/tap states, and submit feedback while keeping sharp poster styling
- [ ] Strengthen haptic feedback behavior with a shared helper for tap, success, warning/life-loss, drawer, and submit patterns with safe browser fallback
- [ ] Add an email-only signup request section on the unauthenticated landing page
- [ ] Add database-backed signup request persistence so submitted emails can be reviewed and approved from the Database section/admin data workflow
- [ ] Add founder/admin visibility for signup requests without disrupting existing participant, Monzo, WhatsApp, Warden, or life-loss mechanics
- [ ] Restyle the journal/reflection entry area using the provided Framer reference as inspiration, with a more premium card/input interaction while preserving existing daily-log fields
- [ ] Add focused Vitest coverage for signup request validation/persistence and haptic/progress utilities where practical
- [ ] Run full tests, production build, and preview health check after v3 refinements
- [ ] Save a named checkpoint after the v3 refinement pass is complete
