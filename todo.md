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
- [x] Test on mobile devices (iPhone and Android) for haptics and responsive design
- [x] Save checkpoint after front-end redesign completion
- [x] Lock the Claude artifact and participant poster mockup as the primary visual reference for v2: sharp edges, no border radius, heavy uppercase typography, near-black base, warm gold accents, deep red danger states, green completion states, purple Ghost Life states, and compact no-waste spacing
- [x] Ensure the v2 front-end implementation follows the poster DNA rather than generic dashboard, SaaS, Framer marketplace, or soft-card styling
- [x] Treat pasted_content_5 as the closest app-screen mockup reference while adapting it to the existing React/Tailwind/tRPC app without backend changes
- [x] Approved implementation: execute the front-end-only poster/Claude artifact redesign while preserving backend, schema, life-loss logic, Monzo flow, WhatsApp persistence, and Warden scaffolding
- [x] Implement the redesign from REDESIGN_BRIEF.md and FRONTEND_REDESIGN_EDIT_LIST.md, prioritizing Today’s Log as the participant default landing experience

## Refinement Pass (v3) — Transitions, Haptics, Signup Approval, Journal Component
- [x] Save a safety checkpoint for the completed v2 redesign before making v3 changes
- [x] Inspect the provided Framer journal/testimonial reference and translate its interaction style into native React/Tailwind without importing marketplace components
- [x] Add fine-grained transitions for tab changes, rule expansion, sheet open/close, CTA hover/tap states, and submit feedback while keeping sharp poster styling
- [x] Strengthen haptic feedback behavior with a shared helper for tap, success, warning/life-loss, drawer, and submit patterns with safe browser fallback
- [x] Add an email-only signup request section on the unauthenticated landing page
- [x] Add database-backed signup request persistence so submitted emails can be reviewed and approved from the Database section/admin data workflow
- [x] Add founder/admin visibility for signup requests without disrupting existing participant, Monzo, WhatsApp, Warden, or life-loss mechanics
- [x] Restyle the journal/reflection entry area using the provided Framer reference as inspiration, with a more premium card/input interaction while preserving existing daily-log fields
- [x] Add focused Vitest coverage for signup request validation/persistence and haptic/progress utilities where practical
- [x] Run full tests, production build, and preview health check after v3 refinements
- [x] Save a named checkpoint after the v3 refinement pass is complete
- [x] Add an animated loading/entry page inspired by the attached dark 6+1 log visual, with oversized ghosted mark, scan-line motion, and smooth transition into the app
- [x] Ensure the animated loading page respects reduced-motion settings and does not slow authenticated users unnecessarily
- [x] Fix API query failure caused by missing `signup_requests` table in the database
- [x] Add/verify explicit animated open-close transitions for detail panels/drawers such as leaderboard and rewards selections
- [x] Add/verify visible submit-feedback transition states for the daily log submit interaction beyond haptics/toast
- [x] Reduce and streamline wording in the My Day section while preserving all daily-log fields and validation logic
- [x] Make the animated loading page 6+1 logo/mark heavier, clearer, and more visually dominant against the dark background

## Refinement Pass (v4) — Email-Gated Personalized Onboarding
- [x] Define the recognized-email flow so users whose email already exists or is approved can continue into the challenge without repeating onboarding
- [x] Define the new-email flow so unknown users are asked to complete a short questionnaire before access is personalized
- [x] Persist questionnaire answers and use them to personalize the participant profile/onboarding state
- [x] Allow new users to upload a profile picture using the project storage helpers rather than local project assets
- [x] Add founder/admin visibility for new questionnaire/profile submissions where appropriate
- [x] Add validation and tests for recognized-email checks, unknown-email questionnaire submission, and profile photo metadata handling
- [x] Run full TypeScript, test, build, and preview validation after v4 onboarding changes
- [x] Save a named checkpoint after the v4 onboarding refinement is complete

## Refinement Pass (v4) — Email-Gated Personalized Onboarding and Header Logo
- [x] Define the recognized-email flow so users whose email already exists or is approved can continue into the challenge without repeating onboarding
- [x] Define the new-email flow so unknown users are asked to complete a short questionnaire before access is personalized
- [x] Persist questionnaire answers and use them to personalize the participant profile/onboarding state
- [x] Allow new users to upload a profile picture using the project storage helpers rather than local project assets
- [x] Add the 6+1 logo/mark to the top app screen/header so it is visible outside the loading page
- [x] Add founder/admin visibility for new questionnaire/profile submissions where appropriate
- [x] Add validation and tests for recognized-email checks, unknown-email questionnaire submission, profile photo metadata handling, and header logo rendering
- [x] Run full TypeScript, test, build, and preview validation after v4 onboarding/header changes
- [x] Save a named checkpoint after the v4 onboarding and header-logo refinement is complete

## Test Coverage Gaps Identified During v4 Validation
- [x] Add Vitest coverage for recognized-email gating so existing participants and approved signup emails bypass onboarding while unknown emails return questionnaire_required
- [x] Add frontend/component-level coverage for the persistent top-screen 6+1 logo and the unknown-email onboarding gate state

## Refinement Pass (v4.1) — Real Brand Logo in Top Corner
- [x] Use the uploaded IMG_1069.webp brand image as the visible top-corner site logo instead of the text-only 6+1 mark
- [x] Upload/store the logo through the approved web project static-asset workflow and reference the returned URL in code
- [x] Update the authenticated app header and onboarding gate header so the real logo image is visible in the top corner
- [x] Add real frontend runtime tests that render the app header with mocked auth/snapshot data and verify the uploaded logo appears in the top corner
- [x] Add real frontend runtime tests that render the unknown-email questionnaire gate from mocked auth/snapshot data rather than source-string checking
- [x] Run full TypeScript, test, build, and preview validation after the real-logo update
- [x] Save a named checkpoint after the real-logo and runtime-test refinement is complete
- [x] Improve the real uploaded header logo visibility against the dark app chrome without replacing the brand artwork


## Refinement Pass (v4.2) — White Brand Logo Correction
- [x] Convert the real uploaded top-corner brand logo treatment from blue/purple to white while preserving the original 6+1 artwork shape
- [x] Upload/store the white logo through the approved web project static-asset workflow and reference the returned URL in code
- [x] Update header and onboarding logo runtime tests to verify the white-logo storage asset
- [x] Run full TypeScript, test, build, and preview validation after the white-logo update
- [x] Save a named checkpoint after the v4.2 white-logo correction
- [x] Apply the white logo treatment to the landing/loading page as well as the in-app top-corner header logo

## Refinement Pass (v4.3) — Logo Placement, Loading Animation, and Responsive Polish
- [x] Reposition the white 6+1 header logo so it sits naturally in the top corner without disrupting the poster-style header hierarchy
- [x] Remove the black-box visual artifact around the logo while preserving legibility on dark app chrome
- [x] Improve the public landing and loading-page logo presentation so it feels integrated rather than pasted on
- [x] Redesign the loading animation to better match the sharp 6+1 poster aesthetic with smoother entry timing
- [x] Make header logo, landing logo, and loading animation responsive across desktop, tablet, and mobile breakpoints
- [x] Add or update runtime tests for responsive logo/loading markup where practical
- [x] Run full TypeScript, test, build, and preview validation after the logo/loading responsive polish
- [x] Save a named checkpoint after the v4.3 logo placement and loading animation refinement
