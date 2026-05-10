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

## Refinement Pass (v4.4) — Site-Native Challenger Login
- [x] Replace public Enter and Start buttons so challengers are not sent to Manus OAuth login
- [x] Add an in-site participant signup/login panel suitable for people who do not have Manus accounts
- [x] Preserve founder/admin Manus access separately from normal challenger entry
- [x] Wire the site-native participant session into My Day, onboarding, leaderboard, proof, rewards, and challenge submission flows
- [x] Add backend/session safeguards so participant identity is not spoofed by plain client-only state
- [x] Add Vitest coverage for public challenger login/signup and founder/admin access separation
- [x] Run full TypeScript, test, build, and preview validation after replacing the public login flow
- [x] Save a named checkpoint after the v4.4 site-native challenger login refinement

## Refinement Pass (v4.5) — No-Code Challenger Registration
- [x] Replace the public access-code entry requirement with a clearer Register flow for new challengers
- [x] Add a returning-user login path that does not require Manus accounts and does not ask new users for an access code
- [x] Preserve founder/admin Manus access separately from public challenger registration and login
- [x] Prevent protected Manus/founder account impersonation while allowing ordinary public challenger registration
- [x] Update frontend copy so the entry panel explains Register versus Returning Login simply
- [x] Update Vitest coverage for no-code registration, returning login, and founder/admin separation
- [x] Run full TypeScript, test, build, and preview validation after the v4.5 registration refinement
- [x] Save a named checkpoint after the v4.5 no-code challenger registration refinement

## Refinement Pass (v4.5 Follow-up) — Returning Login Semantics
- [x] Implement true returning-user login semantics so login rejects unknown emails instead of auto-registering them
- [x] Add Vitest coverage proving returning login rejects unknown emails while register creates new challenger accounts
- [x] Re-run full TypeScript, test, build, restart, and preview validation after correcting returning-login behavior
- [x] Save a named checkpoint after the corrected v4.5 registration/login refinement

## Refinement Pass (v4.5 Final Validation) — Helper-Level Auth Coverage
- [x] Add focused Vitest coverage for the real site-native helper proving register creates a new challenger and returning login rejects unknown emails
- [x] Re-run full TypeScript, test, build, restart, and preview validation after helper-level coverage
- [x] Save the final v4.5 checkpoint after helper-level validation is complete

## Refinement Pass (v4.6) — Public Entry, Personalization, and Exact Landing Copy
- [x] Remove founder/admin Manus login from the public-facing logged-out UI entirely
- [x] Simplify logged-out entry to only Register for new challengers and Log in for returning members
- [x] Add five registration personalization questions for goals, motivation, obstacles, support needs, and Warden journey context
- [x] Replace the logged-out landing page copy with the exact text from /home/ubuntu/upload/pasted_content.txt while keeping the page visually structured and not text-heavy
- [x] Preserve responsive behavior across mobile, tablet, and desktop after the public-entry redesign
- [x] Update automated tests for the personalized registration payload and public UI changes
- [x] Run full validation and save a new checkpoint

## Blocking Bug — Database Migration Mismatch
- [x] Fix runtime query failure where the application selects participants.supportNeeded before the database has the supportNeeded column
- [x] Apply the generated v4.6 supportNeeded migration to the live development database
- [x] Validate that authenticated admin and participant snapshot queries load after the migration

## Refinement Pass (v4.7) — Streamlined Register Click Flow
- [x] Keep the logged-out home page entry panel simple, with no five-question form visible by default
- [x] Show the five personalization questions only after a visitor clicks Register
- [x] Keep returning-member login as email-only with no display-name or questionnaire fields
- [x] Add a clear back/cancel path from the registration questionnaire to the simple entry panel
- [x] Update validation/tests for the streamlined public entry and register-questionnaire flow

## Refinement Pass (v4.8) — Dedicated Registration Page, Universal Warden, Compact Home
- [x] Move registration and the five onboarding questions out of the home page into a dedicated registration page
- [x] Keep the public home page entry simple with clear navigation to Register and returning-member email login
- [x] Remove any user-facing Warden type/personality selection from registration or onboarding
- [x] Make the Warden framing universal and data-driven, using app activity and group-chat signals rather than a selected type
- [x] Redesign the public home page to display the provided challenge information in compact, smart sections instead of an endless scroll
- [x] Preserve the exact supplied landing copy while improving layout density, scanability, and responsive behavior
- [x] Add back/cancel navigation from the dedicated registration page to the public home page
- [x] Update frontend and server tests for the dedicated registration route, email-only login, universal Warden copy, and compact public home layout
- [x] Run full TypeScript, automated tests, production build, preview health check, and save a checkpoint

## Refinement Pass (v4.9) — Fixed 6 May Challenge Calendar
- [x] Set the challenge start date to 6 May for challenge-day calculations
- [x] Ensure every calendar day from 6 May is represented and trackable as a challenge day
- [x] Update daily log logic so workout, food, water, sleep, reflection, and proof states are tied to the correct challenge date
- [x] Show missed or unlogged days clearly so participants and admin can trace the challenge from day one
- [x] Update dashboard/home copy where needed to communicate that the challenge has already started from 6 May
- [x] Add or update automated tests for fixed-date challenge-day calculation and per-day log tracking
- [x] Validate the fixed calendar behavior, save a checkpoint, and deliver the updated version

## Bug-Fix Pass (v5) — Login Animation, Logging, Mobile Bounds, Names, and App Icon
- [x] Restore or add the login/entry animation so signing in does not feel abrupt
- [x] Fix daily task state styling so tasks only show green when genuinely completed and remain visually clear otherwise
- [x] Investigate and fix gym/session proof image upload for exercise logging
- [x] Remove the reflection public/private option so reflections are not presented with a public toggle
- [x] Fix mobile Overview layout so people names, stats, graph, and leaderboard content stay within screen bounds
- [x] Keep the Overview graph persistently visible at the top on mobile where practical
- [x] Use participant display names instead of email addresses throughout app UI surfaces, including board/leaderboard/proof/admin-facing summaries where appropriate
- [x] Ensure long names and text are bounded, wrapped, or truncated so nothing hangs off-screen
- [x] Update the installable web-app icon/favicon/manifest to use the 6+1 logo
- [x] Add or update tests for the v5 bug fixes, run full validation, and save a checkpoint
- [x] Remove any £100 upfront deposit wording, UI assumptions, tests, or data labels; the challenge must state there is no upfront deposit

## Logo Loading Fix Pass
- [x] Diagnose why 6+1 logos are not loading across the site after deployment
- [x] Replace fragile logo/icon references with reliable web-app-safe asset URLs or generated public assets
- [x] Ensure header, landing, loading, favicon, Apple touch icon, and manifest icons all load the correct 6+1 logo
- [x] Add or update tests for logo references and run validation before checkpointing

## Mobile Logo Stacking Fix Pass
- [x] Diagnose why the mobile loading logo and top-left app logo appear stacked or duplicated
- [x] Adjust mobile loading/header logo layout so only the intended logo is visible and no marks overlap
- [x] Validate the mobile logo transition and header rendering with tests, build, and preview health before checkpointing

- [x] Fix mobile public landing header text clipping next to the 6+1 logo so the tagline wraps within the viewport
- [x] Fix mobile public landing hero/body text clipping so all challenge copy wraps within the viewport

- [x] Fix public landing page logo rendering so the brand image loads instead of stacked text characters in the top-left corner

## Refinement Pass (v5.1) — Logo Fix, Profile Pictures, and Calendar View
- [x] Diagnose why the 6+1 logo is still not rendering on the app header and loading page
- [x] Fix the logo rendering by computing the absolute URL in useEffect at runtime
- [x] Add participant profile picture upload during onboarding and settings (already implemented)
- [x] Build calendar view with color-coded status markers (completed, missed, life lost, etc.)
- [x] Add milestone waypoint markers for Day 10, 25, 40, and 50 in the calendar
- [x] Integrate calendar view into the app navigation as "Journey" tab
- [x] Run full validation, tests, build, and preview health check (47 tests passing, build successful)
- [x] Save checkpoint after v5.1 logo fix, profile pictures, and calendar implementation

## Refinement Pass (v5.2) — Logo Fix, Calendar Redesign, Mobile Nav Fix
- [x] Fix logo rendering to display brand image instead of stacked text "6+1" — implemented via trpc.auth.logoUrl server procedure
- [x] Redesign Calendar as proper grid (like month view) with color-coded dots for each day — implemented responsive grid with aspect-square cells
- [x] Add legend/key to calendar explaining what each color means (completed, missed, life lost, future, etc.) — added Status Legend section
- [x] Fix mobile navigation bar stacking — keep tabs horizontal on small screens — changed from grid-cols-5 to flex with min-w-full and overflow-x-auto
- [x] Run full validation, tests, build, and preview health check — 47 tests passing, build successful, dev server running
- [x] Save checkpoint after v5.2 logo fix, calendar redesign, and mobile nav fix — saved as bf63e429

## Bug Fix — Login Does Not Transition to Tracking Page
- [x] Diagnose why successful returning-member login does not switch from public entry to authenticated tracking page — login only invalidated auth, leaving the UI dependent on an async refetch before switching
- [x] Fix login success handling so auth/session state refreshes and Today’s Log opens automatically — site login now immediately hydrates `auth.me` cache with the returned user before invalidating
- [x] Add or update tests for successful login transition behavior — added source-level coverage confirming auth cache hydration occurs before invalidation
- [x] Run full validation, tests, build, and preview health check after the login fix — 48 tests passing, TypeScript check successful, production build successful, dev server healthy
- [x] Save checkpoint after the login transition fix — included in the next checkpoint

## Bug Fix — Logo Still Appears Stacked in Header and Loading Page
- [x] Diagnose why the top-left header logo and loading-page logo still appear stacked or visually cramped despite image URL changes — uploaded asset itself reads as stacked in these compact placements
- [x] Replace the current fallback/asset treatment with a cleaner image-first logo presentation that does not look stacked on mobile or desktop — header/loading now use a horizontal 6+1 wordmark
- [x] Ensure the header logo and loading-page logo use consistent sizing, object-fit, and non-wrapping layout — added `brand-wordmark` and `load-mark-wordmark` styles
- [x] Update or add automated coverage for the polished logo markup and fallback behavior — updated logo tests to assert the non-wrapping wordmark
- [x] Run full validation, tests, build, and preview health check after the logo fix — 48 tests passing, TypeScript check successful, production build successful, dev server healthy
- [x] Save checkpoint after the logo visual fix — included in the next checkpoint


## Logo Image Correction — Loading Page and App Header
- [x] Replace the current text-style wordmark on the loading page with the actual logo image
- [x] Replace the current text-style wordmark in the app header with the actual logo image
- [x] Keep the image-based logo polished with proper sizing, object-fit, and non-stacked/non-cramped layout on mobile and desktop
- [x] Update automated tests to expect image-based logo rendering in the loading page and app header
- [x] Run full validation, tests, production build, and preview health check after the logo image correction — 48 tests passing, TypeScript check successful, production build successful, preview healthy
- [x] Save checkpoint after the logo image correction — saved as 83d67ec9

## Bug Fix — Loading and Header Logo Flicker / Missing Image
- [x] Diagnose why the loading-page logo and top-header logo flicker away, disappear, or reveal the old eroded logo
- [x] Remove unstable logo fallback or delayed source swapping that causes the old eroded logo to appear
- [x] Enforce one stable intended logo image source for the loading page and top-header/logo area
- [x] Ensure the logo remains visible during loading without layout jump, flicker, or fallback text/image swap
- [x] Update automated tests for the stable logo source and no old eroded-logo fallback behavior
- [x] Run full validation, production build, and preview health check after the logo flicker fix
- [x] Save checkpoint after the loading/header logo flicker fix

## UX Refinement — Must-Do Rule Checklist and Compact Calendar
- [x] Redesign the 6 daily rules section as an unmistakable must-do area with a red warning-style border/frame
- [x] Add clear pending versus completed states for each rule, with completed items turning green
- [x] Add supported haptic feedback when a rule is marked done and provide a lightweight completion sound cue
- [x] Add a stronger “done” moment when rules are completed without making the experience distracting
- [x] Simplify the calendar section into a compact vintage flick-card style showing one date/time by default
- [x] Add an option to expand from the compact flick-card into the full calendar view
- [x] Tune calendar styling so it matches the dark, gold, high-stakes challenge aesthetic more closely
- [x] Update automated tests for the must-do checklist states and expandable calendar behavior
- [x] Run full validation, tests, production build, and preview health check after these UX refinements
- [x] Save checkpoint after the must-do checklist and compact calendar refinements

## Bug Fix — Logo, Submission Life Loss, and Proof Images
- [x] Fix the logo image so it appears correctly on the loading page
- [x] Fix the logo image so it appears correctly on the Today’s Log header/log view
- [x] Diagnose why completed read and teach submissions can still be treated as missed rules
- [x] Fix submission completion/life-loss logic so completed rules do not incorrectly remove a life
- [x] Diagnose why uploaded proof images are not loading in the Proof section
- [x] Fix proof image storage/retrieval/rendering so uploaded images display reliably
- [x] Add regression tests for logo rendering, submission completion logic, and proof image display paths
- [x] Run full validation, production build, and preview health check after these bug fixes
- [x] Save checkpoint after the logo/submission/proof bug fixes

## Change Request — Draft Save and Next-Day Auto-Submit
- [x] Allow users to save or submit partial daily progress during the same day without immediately losing a life
- [x] Rename or adjust the daily action UI so incomplete entries are clearly saved as progress rather than treated as final failure
- [x] Apply life-loss penalties only when an incomplete day reaches the next-day deadline or auto-submit condition
- [x] Add backend logic or endpoint support for deadline-based auto-submit/life-loss handling without double-penalizing a day
- [x] Add regression tests proving partial same-day saves do not lose lives and overdue incomplete days do lose a life once

## Bug Fix / Change Request — Fair Daily Logging and Ghost Life

- [x] Enforce one daily log record per participant per day so repeated saves update the same day rather than creating duplicate submissions
- [x] Allow users to save partial progress during the day without triggering manual life loss
- [x] Prevent the main daily action from acting like a penalty submit unless all six rules are complete
- [x] Automatically finalize the previous day on the next-day rollover and apply penalties only for genuinely incomplete rules at that point
- [x] Remove the default “0” visual value from exercise minutes so the field starts blank until the user enters training minutes
- [x] Fix read and teach completion so a hidden or overly strict word limit does not unfairly mark users incomplete when they have provided a teaching
- [x] Ensure proof images uploaded for exercise display reliably in the proof section and remain attached to the saved daily log
- [x] Make Ghost Life a clear purple once-only recovery action when tapped, with the participant receiving the ghost life only once
- [x] Add regression coverage for one-log-per-day saves, partial draft saves, next-day finalization, read/teach completion, proof image rendering, and Ghost Life once-only behavior
- [x] Run full validation, production build, and preview health check after these fixes
- [x] Save checkpoint after the fair daily logging and Ghost Life fixes

## UI Refinement — Quieter Save Progress Feedback

- [x] Replace the distracting save-progress pop-up with a calmer in-flow confirmation
- [x] Keep a clear saved/progress confirmation without interrupting users while logging rules
- [x] Update regression coverage for the quieter save feedback behavior
- [x] Run validation, production build, and preview health check after the feedback refinement
- [x] Save checkpoint after the quieter save-progress feedback refinement

## Bug Fix — Participant Photos, Paid Images, and Real Logo Usage

- [x] Show each participant’s display picture consistently wherever participant identity is shown
- [x] Fix the paid section so reward or payment-related images load reliably instead of appearing broken
- [x] Use the actual uploaded logo image in the loading-page animation, not a text or fallback mark
- [x] Use the actual uploaded logo image for the left-side/top-left app logo, not a text or fallback mark
- [x] Add or update regression coverage for participant display pictures, paid-section image paths, and real logo image rendering
- [x] Run full validation, production build, and preview health check after the image/logo fixes
- [x] Save checkpoint after the participant photo, paid-image, and real-logo fixes

- [x] Exclude users tagged as admin/founder from competitor-facing game views and rankings so admin accounts do not appear as challenge participants
- [x] Add or update regression coverage proving admin-tagged accounts are filtered out of participant game lists while remaining able to manage the app

## Bug Fix — Ghost Life Lock, Compact Save Feedback, and Permanent Inverted Logo

- [x] Make Ghost Life visibly and functionally locked once it has already been used so users cannot attempt it again
- [x] Reduce the save-progress confirmation footprint so it no longer takes up too much screen space
- [x] Permanently replace the unreliable logo source with a stable inverted logo asset that matches the dark/gold site colour scheme
- [x] Ensure the loading-page logo and top-left app logo both use the same reliable inverted asset without fallback flicker
- [x] Add or update regression coverage for Ghost Life used-state locking, compact save feedback, and permanent inverted-logo rendering
- [x] Run TypeScript, tests, production build, and preview health check after these fixes
- [x] Save checkpoint after the Ghost Life, compact save feedback, and inverted-logo fixes

## Change Request — Persistent Session and Draft Recovery

- [x] Preserve in-progress daily log draft replies when a participant leaves, refreshes, or reopens the web app before final submission
- [x] Restore saved draft fields automatically for the correct participant and challenge day without mixing users or days
- [x] Make the login experience keep users in a logged-in state where the existing platform/session cookies allow it, with a clear fallback if the session has expired
- [x] Add explicit draft-saved and draft-restored source behavior without using large intrusive pop-ups
- [x] Add or update regression coverage for daily draft persistence, user/day scoping, restore behavior, and session-friendly login continuity
- [x] Run TypeScript, tests, production build, and preview health check after persistence fixes
- [x] Save checkpoint after the persistent session and draft-recovery improvements

## Bug Fix — Stable Logo Assets and Mobile Proof Images

- [x] Diagnose why header/loading logos degrade to the blue missing-image question mark after time on deployed/mobile sessions
- [x] Replace or rework fragile logo URL handling so the same intended 6+1 logo remains visible on the header and loading page without expiry or fallback flicker
- [x] Diagnose why proof images fail to load on mobile phones despite being attached to daily logs
- [x] Fix proof image URL storage/rendering so uploaded proof images load reliably on deployed mobile browsers
- [x] Add or update regression coverage for stable logo sources and proof image rendering paths
- [x] Run TypeScript, tests, production build, and preview health check after image-loading fixes
- [x] Save checkpoint after the stable logo and mobile proof-image fixes

## Bug Fix and UX — Live Mobile Images and Board Participant Cards

- [x] Diagnose why the live mobile logo still becomes a blue missing-image question mark after login refresh
- [x] Replace fragile logo delivery with a refresh-safe embedded or locally generated app asset that works on live mobile without storage expiry
- [x] Diagnose why proof feed cards on the live phone view show only an "Open proof image" link instead of the uploaded proof image
- [x] Fix proof feed mobile rendering so proof images display inline when the stored file is an image, with a clear link fallback only for non-image or failed loads
- [x] Make Board participant identity cards tappable on mobile and desktop
- [x] Add a participant stats detail panel/modal showing their challenge stats when a Board card is tapped
- [x] Allow participant display pictures to be enlarged from the Board detail view
- [x] Add or update regression coverage for live-safe logo assets, inline proof image rendering, tappable Board cards, participant stats, and enlarged display pictures
- [x] Run TypeScript, tests, production build, preview health check, and live-style image URL checks after the fixes
- [x] Save checkpoint after the live mobile image and Board participant-card fixes

## Bug Fix — High-Contrast Logo Artwork

- [x] Diagnose why the app-origin logo artwork appears almost black on the black mobile background even though it loads
- [x] Replace the current too-dark logo SVG/artwork with a high-contrast gold/white version that is clearly visible in header and loading views
- [x] Ensure the logo remains an app-origin asset and does not reintroduce expiring storage-backed image URLs
- [x] Add or update regression coverage for high-contrast logo asset content and app-origin references
- [x] Run TypeScript, tests, production build, preview health check, and direct logo response checks after the logo artwork fix
- [x] Save checkpoint after the high-contrast logo artwork fix

## Bug Fix — Visible Header and Loading Logo Replacement

- [x] Ensure the replacement high-contrast logo is the actual visible logo in the top-left app/header corner
- [x] Ensure the replacement high-contrast logo is the actual visible logo on the loading page
- [x] Remove or bypass any old logo rendering path that can still appear in those two locations
- [x] Update regression coverage for top-left header and loading-page logo rendering
- [x] Run focused validation, build checks, preview confirmation, and save checkpoint

## Change Request — Reference Logo, Overview Metrics, and Submit Haptics

- [x] Recreate the attached 6+1 logo style in the app’s dark/gold/red/white palette so it is visible and premium on black backgrounds
- [x] Replace the current bad top-left header logo with the palette-correct reference-style logo
- [x] Replace the loading-page logo with the same palette-correct reference-style logo
- [x] Redesign the Overview tab as a participant-wide dashboard with group progress, participant comparison, compliance trends, complex metrics, and risk/streak insights
- [x] Add strong haptic vibration feedback after a successful day submission when all six rules are green/completed
- [x] Update regression tests for the reference-style logo placements, Overview dashboard metrics, and all-green submit haptic feedback
- [x] Run full tests, TypeScript, production build, preview validation, and save checkpoint

## Bug Fix — Draft Toggle Duplicate Streak Exploit

- [x] Reproduce and diagnose the loophole where saving a draft after unticking a completed rule, then reticking and logging the day, can award extra completed-day streak credit
- [x] Enforce backend idempotency so each participant and calendar day can only increment days-complete, points, and streak once
- [x] Prevent draft saves from rolling back or resetting the completed-awarded state for an already completed day
- [x] Ensure repeated log-day submissions for the same completed day update the log safely without awarding another streak/day-complete bonus
- [x] Add regression tests covering draft-toggle resubmission, repeated completed submissions, and completed-to-draft-to-completed transitions
- [x] Run full tests, TypeScript, production build, preview validation, and save checkpoint

## Bug Fix — Mobile Broken Logo Icon in Header and Loading Screen

- [x] Reproduce and diagnose why mobile Safari shows a broken image icon for the top-left header logo and loading-screen logo
- [x] Remove dependency on any failing or mobile-incompatible logo URL in those two visible render locations
- [x] Replace the header and loading logos with a durable app-served palette-correct logo that renders on mobile browsers
- [x] Add regression coverage that prevents broken external/storage logo references from returning in the header and loading screen
- [x] Validate the mobile-sized preview, direct logo response, full tests, TypeScript, production build, and save checkpoint

## Current Continuation — Mobile Logo Reliability and Streak Integrity
- [x] Replace all failing storage-backed brand logo references with the durable app-origin `/six-plus-one-logo.svg` path in UI, registration, server endpoint, and regression tests
- [x] Close the draft-toggle streak exploit with backend one-completion-per-day enforcement and regression tests

## Requested Update — Overview Declutter, Board Compliance, 5/6 Pass Rule, and Logo Replacement
- [x] Remove or reduce crowded compliance-detail data from the Overview tab so it focuses on higher-level progress only
- [x] Add participant compliance details to the Board individual drill-down view when a user taps a participant
- [x] Update backend completion rules so 5 out of 6 completed daily rules counts as a passed/completed day
- [x] Update visible copy and counters from strict 6/6 completion language to the new 5/6 pass threshold where applicable
- [x] Replace the current top-left header logo and loading-screen logo with the previously generated logo image asset instead of the current SVG/logo treatment
- [x] Update regression tests for the 5/6 pass rule, Board compliance drill-down, Overview decluttering, and logo source behavior
- [x] Run full tests, production build, preview health checks, and save a checkpoint

## Requested Update — Rewards Catalogue and Tap-to-Redeem Admin Notification
- [x] Limit the rewards section to exactly three rewards: 150 Puresport Mystery Item, 300 6plus1 T-Shirt, and 500 Group Meal Unlocked
- [x] Update reward seeding or catalogue defaults so old rewards no longer appear in fresh catalogue views
- [x] Make reward redemption a simple tap action that creates the redemption request when the participant has enough points
- [x] Notify the admin/owner through the built-in Manus notification flow whenever a participant redeems a reward
- [x] Update reward UI copy and tests to verify the exact three rewards and admin notification behavior

## Bug Fix — Mobile Board Participant Card Navigation
- [x] Fix the Board participant drill-down/card layout so it is readable and usable on mobile after tapping a participant
- [x] Add an obvious back or close control so mobile users can return from the participant card to the Board list
- [x] Add or update regression coverage for the mobile participant-card layout and back/close navigation
- [x] Run validation, production build, preview health check, and save a checkpoint after the mobile Board card fix

## Investigation — Mobile Logo and Haptics
- [x] Investigate why the app logo still appears broken on mobile/deployed view without running a build yet
- [x] Inspect current haptics/vibration implementation and identify browser/device limitations
- [x] Propose the safest logo and haptics fix path before substantial implementation changes

## Fix Batch — Mobile Logo and Haptics

- [x] Replace the current heavy PNG logo reference with a lightweight mobile-safe optimized asset.
- [x] Route logo rendering through a reliable same-origin path and add a readable fallback when image loading fails.
- [x] Strengthen haptic patterns for Android browsers that support vibration.
- [x] Add iPhone/Safari-safe visual haptic fallback for unsupported vibration environments.
- [x] Add or update regression coverage for logo fallback and haptic trigger behavior.
- [x] Run validation, production build, preview health check, and save a checkpoint after the logo and haptics fixes.

## Fix Batch — Mobile App Polish and PWA Install

- [x] Move the Log Today stat cards for Rules addressed, Current streak, and Points below the Must Do section.
- [x] Configure the saved home-screen web app name to use the game name, 6+1 4 Lives Challenge.
- [x] Configure the saved home-screen web app icon to use the same lightweight 6+1 logo treatment as the in-app header.
- [x] Add install guidance or an install button/help flow, noting that browsers require the user to confirm saving the app to home screen or desktop.
- [x] Fix mobile bottom navigation safe-area spacing so the far-left and far-right tabs are not cropped in home-screen app mode.
- [x] Add a limelight-style active state to the mobile bottom navigation while preserving the current 6+1 dark/gold visual system.
- [x] Add or update regression coverage for the reordered Log Today layout, PWA metadata, and bottom navigation cropping/active-state behavior.
- [x] Run validation, production build, preview health check, and save a checkpoint after the mobile app polish fixes.

## Follow-up Fix — Bottom Navigation Flash and Install Banner Removal
- [x] Remove the save-to-desktop/home-screen install banner from the authenticated app UI.
- [x] Fix the mobile bottom navigation tab transition so tapping a new tab does not flash off/on before moving to the selected tab.
- [x] Update regression coverage for the removed banner and smoother mobile navigation behavior.
- [x] Run validation, production build, preview health check, and save a checkpoint after this follow-up fix.

## Follow-up Fix — Correct Home-Screen Logo Artwork
- [x] Replace the circled installed PWA/home-screen icon artwork with the correct orange 6+1 logo style shown by the user.
- [x] Keep the install banner removed and the bottom navigation flash fix intact while updating the icon artwork.
- [x] Update regression coverage so the PWA icon generation expects the orange background treatment rather than the dark badge-style icon.
- [x] Run validation, production build, preview health check, and save a checkpoint after the corrected home-screen icon fix.

## Follow-up Fix — PWA Icon Fill
- [x] Increase the orange PWA/home-screen icon artwork scale so the 6+1 logo fills the icon box more tightly.
- [x] Update regression coverage for the tighter PWA icon fill/scaling contract.
- [x] Run validation, production build, preview health check, and save a checkpoint after the icon fill adjustment.

## Enhancement — Site-Wide Motion Polish
- [x] Add a cohesive motion system for animations, transitions, transforms, and micro-interactions across the app.
- [x] Apply intuitive motion to key user moments such as landing entry, tab changes, rule cards, submit states, proof/reward interactions, Board cards, and mobile navigation.
- [x] Respect reduced-motion preferences so users who prefer less animation still get a stable accessible experience.
- [x] Keep the motion aligned with the dark/gold 6+1 challenge style without adding distracting or slow effects.
- [x] Update regression coverage for the motion-system hooks, reduced-motion safeguards, and key animated interaction markers.
- [x] Run validation, production build, preview health check, and save a checkpoint after the motion polish pass.


## Current Requested Changes — Daily Status and Warden Autonomy

- [x] Preserve each participant’s completed rule status for the current day so rules already done today remain green.
- [x] Ensure the home page resets daily rule cards only on the next calendar day, not after same-day refreshes or edits.
- [x] Make the home page feel more personalized by loading the signed-in participant’s latest same-day log into their visible rule cards.
- [x] Confirm `/api/whatsapp/webhook` is live for Whapi incoming messages and document the exact public webhook URL.
- [x] Schedule recurring Warden cycles every two hours between 06:00 and 22:00 for hands-free operation.
- [x] Run tests and save a checkpoint after the daily-status and automation changes are verified.

User priority: do not wipe anyone’s work from today; if people have completed some rules today, those rules must stay green until the next day.


## Immediate Safeguard Verification — Same-Day Progress Must Not Be Wiped

- [x] Re-verify that any participant who completed rules today keeps those rule cards green through refreshes, draft recovery, same-day edits, and Warden/scheduler work.
- [x] Add or strengthen regression coverage if any path can overwrite a completed same-day rule with an older or incomplete draft.
- [x] Confirm in the delivery notes that today’s work remains preserved until the next calendar day reset.


## Current Requested Changes — Organic Warden Scheduling

- [x] Increase the Warden daily hard cap from 3 to 4 messages maximum.
- [x] Add daily_drama_score to CHALLENGE_STATE using life losses, milestones, streak milestones, sharp insights, and late logs after 20:00.
- [x] Make daily message frequency data-driven: score 0–2 allows max 2 messages, score 3–5 allows max 3 messages, and score 6+ allows max 4 messages.
- [x] Replace the fixed two-hour Warden cadence with randomized organic windows: 07:00–09:00, 12:00–14:00, 18:00–20:00, and 21:00–22:00.
- [x] Ensure the late 21:00–22:00 Warden window only fires when there is something worth saying.
- [x] Update Warden prompt/logic so messages feel like a watched-all-day presence rather than a cron job.
- [x] Update Make.com/scheduler setup guidance to match the new organic scheduling design.
- [x] Add or update regression tests for dynamic Warden limits, drama scoring, and organic scheduling behavior.
- [x] Run full validation, save a checkpoint, and deliver concise manual setup instructions.

User priority: the Warden should feel alive and unpredictable, choosing moments based on the day’s drama rather than posting mechanically.



## Current Requested Changes — Richer Warden Intelligence

- [x] Expand CHALLENGE_STATE with recent_insights from shared read/teach text, including participant, insight text, timestamp, and rule.
- [x] Expand CHALLENGE_STATE with recent_reflections from shared public reflections, including participant, reflection text, logged time, and sharing status.
- [x] Expand CHALLENGE_STATE with exercise_logs including participant, activity type, duration, proof status, and logged time.
- [x] Add performance pattern lists for improving, declining, silent, and consistent participants.
- [x] Add cross-participant shared_themes so the Warden can connect similar writing across participants.
- [x] Expand daily_drama_score with shared themes, personal bests, deep insights, late-night logs after 21:00, silent-participant returns, Ghost Life use, and before-midday full-rule completions.
- [x] Update the Warden prompt so it explicitly uses recent insights, reflections, exercise logs, shared themes, and participant pattern lists to read the room.
- [x] Add seeded regression coverage with 2–3 sample participants proving enriched state and drama scoring behavior.
- [x] Run tests, production build, health check, save a checkpoint, and report what changed.

User priority: the Warden should read the room, find tensions between words and actions, and speak like a presence rather than a number-watching bot.


## Current Requested Changes — Live Warden Cycle Audit

- [x] Run `warden.runCycle` server-side against current real participant data.
- [x] Capture the full assembled `CHALLENGE_STATE`, including participant data, insights, reflections, and exercise logs.
- [x] Capture the exact generated Warden message or `NO_MESSAGE` result.
- [x] Verify whether WhatsApp posting succeeded and record the API outcome.
- [x] If `NO_MESSAGE`, explain why with drama score, scheduling gate, daily limit, and missing data signals.
- [x] Deliver a concise report with raw supporting evidence attached.


## UI/UX Refinement — Navigation, Graph, Modals, and Points Calculation (Current Phase)

### Navigation & Layout
- [x] Superseded the earlier sticky-header/sidebar interpretation after user correction; implemented persistent bottom-screen navigation instead
- [x] Implement dynamic Save Progress bar that grows as the user scrolls down toward the rule checklist placement
- [x] Test navigation persistence and Save Progress bar behavior through regression coverage and project health checks

### Graph & Participant Filtering
- [x] Convert the Overview stats graph from always-visible to a toggleable focused view
- [x] Implement intelligent participant focus for the graph using Group Pulse summary cards and selected-participant comparison rather than crowded top-10 views
- [x] Prevent graph from presenting all participants at once by default, reducing mobile clutter and confusion
- [x] Add clear toggle/expand controls so users can choose to view the focused graph or keep the compact summary
- [x] Add source regression coverage for the low-clutter Group Pulse and focused graph approach

### Participant Card Modals
- [x] Fix participant card modals so content scrolls internally within the modal rather than forcing whole-page scroll
- [x] Ensure modal has proper height constraints and internal scroll area for tall participant details
- [x] Add sticky modal header/close button so users can always exit the modal
- [x] Add regression markers for mobile-readable participant detail layout and internal overflow handling

### Points Calculation Revamp
- [x] Revise points logic so 5/6 complete rules = full base points, not fractional scoring
- [x] Add behavior-driven point bonuses for consistency, perfection, early completion, Ghost Life restraint, and streak milestones
- [x] Implement variation in points based on participant behavior patterns including full-green days, early completion, Ghost Life usage, and streaks
- [x] Ensure points calculation creates meaningful spread between participants through behavior-based bonuses
- [x] Add Vitest coverage for new points calculation logic with multiple participant scenarios
- [x] Validate points calculation behavior through automated tests and existing challenge flow coverage

### Participant Branding on Logged-In Pages
- [x] Add participant name/display at the top of individual logged-in pages and authenticated surfaces
- [x] Ensure participant identity is clear and persistent across authenticated screens
- [x] Use participant display picture where appropriate for visual branding
- [x] Add regression coverage for participant names and bounded identity rendering

### Validation & Testing
- [x] Run full Vitest suite with new points logic and UI changes
- [x] Validate TypeScript and production build
- [x] Test responsive layout through preview health check and regression assertions
- [x] Verify navigation persistence and Save Progress bar behavior
- [x] Check graph toggle and intelligent focused participant behavior
- [x] Confirm modal scrolling behavior is represented in the participant-card layout implementation
- [x] Save checkpoint after all UI/UX and points changes are complete


## Correction — Updated UI/UX Direction After Force Stop

- [x] Supersede the earlier sticky-top/sidebar navigation interpretation: navigation must be a persistent bottom-of-screen bar, always reachable without scrolling to the page bottom
- [x] Keep the bottom navigation compact, safe-area aware, and stable on mobile so it does not jump, flash, or force page scrolling
- [x] Reduce the Save Progress control so it is not visually oversized, with an adaptive state that stays compact until the user reaches the relevant logging area
- [x] Support multiple proof uploads per daily proof item, including more than one image and/or video where technically supported
- [x] Update storage and rendering logic so multiple proof media items persist with the daily log instead of only one proof URL
- [x] Redesign the Proof section to show multiple media items per participant cleanly, using a carousel or compact swipeable/gallery treatment instead of dumping all content vertically
- [x] Redesign the graph for mobile so even a top-10 participant view is avoided when it is still too crowded
- [x] Replace crowded multi-participant graph behavior with a much smaller, more intelligent summary view, such as highlighted comparisons, individual participant selector, or top movers rather than many simultaneous lines
- [x] Preserve the request for participant-card modals to scroll internally when content is long
- [x] Preserve the request to review points calculation so participant behaviour creates meaningful score variation while 5/6 still counts as a complete day
- [x] Preserve the request to show each logged-in participant’s name clearly on their individual pages
- [x] Reconfirm the final UX approach with the user before building these corrected changes




## Confirmed Detail — Group Pulse and Scroll-Responsive Save Progress

- [x] Build both graph concepts together: compact Group Pulse summary cards and a selected-participant versus group-average chart hidden behind a toggle
- [x] Avoid crowded top-10 mobile chart views; the mobile graph experience should start with concise summary cards and only show one focused comparison at a time
- [x] Make Save Progress scroll-responsive: compact while higher up the page, then gradually larger as the user scrolls down until it reaches its intended full-size placement near the rule checklist
- [x] Ensure the scroll-responsive Save Progress behavior does not cover the persistent bottom navigation or block rule inputs on mobile
- [x] Add or update regression coverage for the combined graph approach and scroll-responsive Save Progress control



## Bug Fix — Fixed Bottom Navigation, Simpler Graph, and Proper Profile Overlays

- [x] Make the bottom navigation truly fixed to the viewport so it is always visible without scrolling to the page bottom
- [x] Add bottom page padding/safe-area spacing so the fixed bottom navigation does not cover page content or action controls
- [x] Simplify the graph section so the default experience is easier to understand and not over-engineered
- [x] When users click View Graph, render the actual graph with the relevant participant data plotted clearly
- [x] Add direct participant-name selection inside the graph view so users can choose a specific person without hunting through the page
- [x] Ensure selected graph participant comparison is obvious on mobile and desktop
- [x] Fix participant profile viewing so tapping a profile opens a proper visible overlay/modal immediately in the viewport rather than inserting a card into the page flow
- [x] Fix Board participant profile viewing with the same proper overlay/modal behavior
- [x] Ensure profile overlays include a clear close/back control and internal scrolling for long content
- [x] Add or update regression coverage for fixed bottom nav, graph participant selection, and modal overlay behavior
- [x] Run validation, production build, preview health check, and save a checkpoint after the fixes



## Issue — Warden Morning Messages Not Sending

- [x] Clarify how Warden messages are supposed to run without creating many extra Manus task chats
- [x] Investigation intentionally skipped here; user is handling the Warden message issue externally through Claude
- [x] Confirm whether Warden delivery is currently driven by Manus scheduled tasks, Make.com, Whapi, or a deployed site endpoint
- [x] Propose a cleaner Warden delivery setup that avoids clogging the user's Manus chat list where possible



## Change — Move Warden Automation to Make.com

- [x] Stop using or creating Manus scheduled/background tasks for routine Warden automation
- [x] Inspect the current Warden endpoint and determine whether Make.com can call it directly
- [x] Design a Make.com scenario that runs the morning Warden schedule without creating Manus task chats
- [x] Confirm the Make.com scenario can trigger the deployed website and use the existing Whapi/WhatsApp delivery path
- [x] Add or adjust a secure HTTP endpoint for Make.com only if the current endpoint is not suitable
- [x] Provide clear Make.com module-by-module setup instructions and required request payloads


## Change — Overview and Board/Bosses Revamp

- [x] Revamp the Overview section so it feels like a key challenge command centre rather than a flat summary
- [x] Add points immediately as tasks are ticked off so the user sees scoring progress from daily actions
- [x] Redesign the graph experience so it is easier to understand, better placed, and not hidden below summary cards after tapping
- [x] Improve Simple Group Signals so Most at Risk, Top Movers, and Most Consistent are calculated from useful challenge signals rather than vague labels
- [x] Define Most at Risk from a combination of tasks left today, time remaining, recent lives lost, streak pressure, and incomplete proof where relevant
- [x] Define Top Movers from recent point gains, completed tasks, streak improvement, and recovery from previous risk
- [x] Define Most Consistent from repeated daily completions, stable proof submission, low life-loss rate, and streak reliability
- [x] Add additional point opportunities for meaningful app usage beyond ticking rules, without making the system easy to game
- [x] Make participant comparison show useful head-to-head metrics such as completion pace, lives trend, proof consistency, streak movement, and point velocity
- [x] Replace the flat boosted section with a meaningful boost explanation that shows why someone is boosted and what action created it
- [x] Add a first, second, and third place podium with distinct colours, stronger visual hierarchy, and subtle animation
- [x] Revamp the Board/Bosses section so leaderboard, podium, boost, and comparison content feel polished and useful
- [x] Add regression coverage for new scoring, group signal calculations, graph placement behavior, participant comparison metrics, and podium ranking display


## Fix — Stop Background Warden Task Triggers

- [x] Identify every Warden-related scheduled/background trigger that can create extra Manus tasks or chats.
- [x] Disable or neutralize the task-creating background Warden trigger path without removing Make.com/manual HTTP Warden endpoints.
- [x] Add safeguards or documentation so future Warden delivery uses Make.com/manual calls rather than Manus background task creation.
- [x] Validate that Warden HTTP/manual endpoints still work and no app code schedules new Manus task chats.

## Refinement Pass — Horizontal Points Strip
- [x] Convert the vertical points breakdown below the lives tracker into a compact horizontal points strip.
- [x] Ensure the horizontal points strip remains readable and space-efficient on mobile screens.
- [x] Add or update regression coverage for the horizontal points strip copy/layout semantics.
- [x] Validate the UI change with tests, production build, and project health check before checkpointing.


## Bug Fix — Board Mobile Ranking Order
- [x] Fix the Board mobile ranking order so the 1st-place card appears before 2nd and 3rd.
- [x] Preserve the existing podium/ranking visual styling while correcting the list order.
- [x] Add regression coverage that prevents visual ordering from putting 2nd before 1st again.
- [x] Validate the Board ordering fix together with the horizontal points strip update before checkpointing.


## Context Package — Claude Review
- [x] Gather current app context for Overview, Board, rules, lives, participant scale, and mobile-first assumptions.
- [x] Capture or prepare screenshots of the Overview and Board pages for external review.
- [x] Write a concise shareable summary that can be pasted into Claude for specific UX improvement suggestions.
- [x] Deliver the summary and relevant screenshot attachments to the user.

## Context Package — Remaining Page Screenshots
- [x] Capture fresh mobile screenshots for the remaining app tabs beyond Overview and Board.
- [x] Include My Day, Proof, Rewards, and Journey screenshots where accessible in the authenticated preview.
- [x] Verify the screenshots visually enough to confirm each page is the intended tab.
- [x] Package the screenshots outside the web project for delivery to the user.

## Review — Attached Six Plus One Redesign PDF
- [x] Inspect the attached `sixplusone-redesign.pdf` to confirm whether its screens and visual direction are readable.
- [x] Summarize the main visible redesign elements and note any parts that are unclear or need follow-up.
- [x] Tell the user whether the PDF can be used as a reference for future app refinements.


## Board Refinement — Story-First Player Status Rows
- [x] Replace default analytical row labels such as pace, velocity, proof percentage, and risk with a single plain-English player status line.
- [x] Implement option 3: keep leaderboard rows clean by default while allowing each player row to expand and reveal the detailed pace, velocity, proof, and risk breakdown.
- [x] Generate status lines from participant data in the app’s Warden-style tone, such as falling behind, strong run, no proof this week, or one life left.
- [x] Preserve visible rank, points, and lives in the default row so competitive scan value remains clear.
- [x] Add or update regression coverage for collapsed status lines and expanded metric detail visibility.
- [x] Validate the Board refinement with tests, production build, and project health check before checkpointing.



## Bug Fix — Counter Overflow and Save Progress Pill Background
- [x] Fix counter/value elements that overflow off cards or off the page on mobile and narrow layouts.
- [x] Audit repeated counter treatments across Overview, Board, My Day, Rewards, Journey, and related compact stat cards so values stay contained.
- [x] Remove the unwanted black rectangular backing behind the Save Progress pill while preserving its scroll-responsive behavior.
- [x] Add or update regression coverage for contained counters and clean Save Progress pill styling.
- [x] Validate the visual fixes with tests, production build, and project health check before checkpointing.


## Bug Fix — Confirmed Mobile Viewport Overflow
- [x] Fix whole-page horizontal overflow on phone screens where the app hangs off the right edge.
- [x] Constrain the lives strip so four lives fit inside the card on narrow mobile widths without forcing page width expansion.
- [x] Constrain the Live Points Strip so point tiles wrap or shrink inside the viewport instead of extending off-screen.
- [x] Keep the floating Save Progress pill centred and viewport-bounded so it does not contribute to horizontal overflow.
- [x] Add or update regression coverage for mobile-safe width constraints and no horizontal overflow markers.
- [x] Validate the fix with focused tests, full tests, production build, project health check, and checkpoint before delivery.


## Refinement — Mobile Live Points Strip Space Use
- [x] Make the mobile Live Points Strip non-swipeable so all point tiles fit in the visible card area.
- [x] Rework the strip spacing and tile sizing to use available mobile width efficiently without forcing horizontal overflow.
- [x] Reduce unnecessary vertical length on the first My Day page so the rule checklist appears sooner on mobile.
- [x] Add or update regression coverage for the compact non-swipeable mobile points strip.
- [x] Validate the refinement with focused tests, full tests, production build, project health check, and checkpoint before delivery.


## Bug Fix — Mobile Save Progress Button Position
- [x] Ensure the floating Save Progress button starts above the mobile bottom navigation bar on page load.
- [x] Ensure the Save Progress button settles above the mobile bottom navigation bar after scroll or animation changes.
- [x] Preserve the clean pill styling without reintroducing a black backing or horizontal overflow.
- [x] Add or update regression coverage for the mobile safe-area bottom offset.
- [x] Validate the fix with focused tests, full tests, production build, project health check, and checkpoint before delivery.


## Redesign — Mobile Board and Overview from Claude Mockups
- [x] Rebuild the mobile Board screen around the provided concept: Boost Key at top, podium with stepped ranking emphasis, full leaderboard rows with life dots, Warden status copy, delta gaps, and elimination-risk styling.
- [x] Add the Boost Key presentation with three rotating-style slots, one claimed example/status state, two open boost rules, and anti-game explanatory copy.
- [x] Rebuild the mobile Overview screen around the provided concept: alarming on-pace stat, three intelligence stats, personal rivalry cards, compare list, lives, pace bars, and risk badges.
- [x] Preserve existing challenge data, leaderboard calculations, participant names, lives, points, and app navigation while changing presentation only.
- [x] Keep the redesign mobile-first, dark, high-contrast, gold/red/green accented, and free of horizontal overflow.
- [x] Add or update regression coverage for the new Board and Overview mobile presentation markers.
- [x] Validate the redesign with focused tests, full tests, production build, project health check, and checkpoint before delivery.

## Bug Fix — Mobile Save Progress Mini Expansion Behavior
- [x] Restore the mobile Save Progress behavior so it begins as a compact mini progress indicator near the bottom navigation instead of a large floating panel.
- [x] Make the mini progress indicator shoot/expand into the proper Save Progress section when the section is reached or becomes active.
- [x] Ensure the expanded Save Progress section does not cover Ghost Life, Warden, or other My Day content on mobile.
- [x] Preserve bottom navigation visibility, safe-area spacing, and no horizontal overflow.
- [x] Add or update regression coverage for the mini-to-expanded Save Progress behavior.
- [x] Validate the fix with tests, typecheck, production build, project health check, and checkpoint before delivery.


## Feature — Warden Mood (AI-Generated Vibe)

- [x] Replace the "Pace" metric in the Overview card with "Warden Mood"
- [x] Implement Warden Mood AI interpretation layer that reads participant logs, reflections, teach data, and proof submissions
- [x] Generate personalized mood statements based on data patterns: consistency, quality, depth, effort trajectory
- [x] Add regression coverage for Warden Mood generation and Overview display
- [x] Validate with tests, typecheck, build, and project health check

## Feature — Boost System (15 Rotating Competitive Modifiers)

### Database & Core Logic
- [x] Create boost_wins table in drizzle/schema.ts with all required fields (challengeId, userId, day, boostId, boostName, boostIcon, pointsAwarded, awardedAt, wardenNote)
- [x] Generate and apply Drizzle migration for boost_wins table
- [x] Create shared boost system helper with all 15 boost definitions, rotation logic, and anti-gaming rules
- [x] Implement getBoostsForDay(day) rotation function using deterministic offset formula
- [x] Implement calculateBoostWinners() function with all 15 boost winner determination logic
- [x] Hook boost calculation into the admin end-of-day boost calculation path without altering base challengeLogic scoring
- [x] Update snapshot data in server/db.ts to expose boost wins and active boosts while preserving additive-only base scoring

### Participant Insights & Data Model
- [x] Add boost data fields to snapshot/participant-facing model: activeBoosts, boostWins, claimed status, and participant boost history display
- [x] Ensure boost data is read-only and does not modify existing daily_logs records

### Board UI Integration
- [x] Add Boost Key display at top of Board showing 3 active boost slots with names, icons, anti-game rules, and claimed status
- [x] Show boost-won badges on player rows when they win a boost today
- [x] Include totalBoostPoints in leaderboard display alongside daily points

### Overview UI Integration
- [x] Add active/claimed boost display to Overview with daily claimed state and additive +5 copy
- [x] Add "Top boost earner overall" to group intelligence section
- [x] Add player's total boost wins to personal rivalry section
- [x] Show alert if any boost slot remains unclaimed at end of day

### Warden Integration
- [x] Add boostContext to Warden payload with todayBoosts, todayWinners, playerBoostHistory, groupBoostLeader, rivalBoostWins
- [x] Add boost trigger events to Warden messaging: boost won, multiple boosts same day, streak of boosts, survivor won, Warden's Pick won, Iron Week, Dead Heat, boost leader change, unclaimed boosts
- [x] Update Warden system prompt with boost context instructions and narrative guidance
- [x] Ensure Warden references boost wins with same sharpness as life events and uses display names (FIRST UP, STREAK KING, etc.)

### Testing & Validation
- [x] Write tests for boost rotation logic (deterministic, no randomness)
- [x] Write tests for each boost winner determination logic
- [x] Write tests for anti-gaming rule enforcement
- [x] Write tests for conditional boost availability (skip when condition not met)
- [x] Write tests for Warden Mood AI interpretation and display
- [x] Verify no historical player data was altered after boost system deployment
- [x] Test single boost fires correctly for a test day
- [x] Test anti-gaming rules block ineligible players
- [x] Test Warden references boost win in next message
- [x] Run full test suite, typecheck, production build, and project health check
- [x] Validate total points calculation includes both daily and boost points
- [x] Validate Boost Key display on Board and Overview stats are accurate

### Checkpoint & Delivery
- [x] Save checkpoint after Boost System and Warden Mood implementation and validation


## Redo Request — Warden Mood and Boost System Under Manus 1.6

- [x] Re-read `boost-system-spec.docx` and treat it as the source of truth for boost rules, additive-only scoring, and Warden integration.
- [x] Audit the current partial state, including the already-added `boost_wins` schema/migration, before writing more code.
- [x] Preserve the spec’s safety rule: do not recalculate historical points, streaks, lives, daily awards, payment events, or existing `daily_logs.pointsAwarded` values.
- [x] Replace or supplement the Overview pace bar with personalized Warden Mood based on each participant’s own logs, reflections, Read & Teach entries, proof data, and effort trajectory.
- [x] Implement the Boost System only as additive new data through `boost_wins`, with deterministic rotation, anti-gaming rules, UI display, and Warden context.
- [x] Add regression tests for Warden Mood, boost rotation, boost eligibility, additive scoring, Board/Overview display contracts, and historical-data safety.
- [x] Run full tests, typecheck, production build, project health check, and save a checkpoint before delivery.

- [x] Produce Claude/Make scraping data audit covering challenge pages, URLs, visible fields, access, layout, and dynamic loading behavior without building new features.

- [x] Convert the Claude/Make scraping audit into a downloadable Markdown document without changing website functionality.


## Refinement — Warden Mood Private Reflection Context

- [x] Audit current Warden Mood generation to confirm whether private reflection log content is included as personal context.
- [x] If missing, incorporate private reflections into Warden Mood inputs while keeping them private and not exposing raw sensitive text in group-facing UI.
- [x] Update Warden Mood prompt/logic so private reflections influence tone, accountability, and personal nuance without directly quoting sensitive content unless already appropriate.
- [x] Add or update regression coverage confirming Warden Mood uses private reflection context for the relevant participant only.
- [x] Validate with focused tests, full tests, typecheck/build where appropriate, project health check, and checkpoint before delivery.


## Bug Fix — Warden Mood Flicker
- [x] Audit why Warden Mood can change or flicker between different labels/details during refreshes or repeated reads.
- [x] Stabilize Warden Mood so it reuses a recent valid mood unless the participant’s underlying log/context meaningfully changes.
- [x] Ensure loading or refetch states do not visually flash a different fallback mood over a valid existing mood.
- [x] Add regression coverage for stable mood reuse and non-flickering UI/query behaviour where practical.
- [x] Validate with focused tests, full tests/typecheck/build as appropriate, project health check, and checkpoint before delivery.


## Copy Refinement — Whole-Site Brand Tone
- [x] Audit user-facing copy across the main site screens, including Today, Overview, Board, Proof, Rewards, Journey, Founder, onboarding, Warden, empty states, labels, CTAs, and status messages.
- [x] Define and apply a consistent 6+1 brand voice: premium, direct, high-accountability, concise, intense, and clear.
- [x] Tighten headlines, subcopy, button labels, helper text, and error/empty states without changing existing product behaviour.
- [x] Add or update regression coverage where copy changes affect tested UI strings.
- [x] Validate with relevant tests, typecheck/build as appropriate, project health check, and checkpoint before delivery.


## Bug Fix — Active-Day Proof Sync
- [x] Audit how proof entered or edited in Today/My Day is saved and how the Proof page reads that proof for the current challenge day.
- [x] Ensure edits made to today’s proof remain visible on the Proof page for the active day until the day ends.
- [x] Ensure Proof page data refreshes or invalidates correctly after today’s proof is edited, without showing stale proof entries.
- [x] Add or update regression coverage for same-day proof edits appearing in the Proof page/feed.
- [x] Validate with relevant tests, typecheck/build as appropriate, project health check, and checkpoint before delivery.


## Bug Fix and Feature — Production Proof Feed Media, Layout, and Warden Insight
- [x] Audit current Proof feed rendering, daily proof save/delete behavior, and production stale-media path for deleted proof items.
- [x] Ensure proof deleted or cleared from My Day no longer appears on the Proof page or production feed for the active day.
- [x] Add support for video proof uploads alongside image proof uploads, including MIME/type validation and persisted media type metadata.
- [x] Render proof videos in the Proof page as muted, plays-inline, autoplaying previews with sensible controls or unmute affordance.
- [x] Correct Proof section proportions on mobile so empty/deleted media does not reserve oversized blank space and real proof media uses a controlled aspect ratio.
- [x] Replace generic quote-style Warden copy with account-linked AI insight generated from each participant’s interpreted data, logs, reflections, and proof context.
- [x] Add regression coverage for deleted proof disappearing, video proof rendering/autoplay attributes, mobile proof proportions, and Warden insight context behavior.
- [x] Validate with relevant tests, typecheck/build, project health check, and checkpoint before delivery.


## Bug Fix and Feature — Proof Page Visibility and Deep Thought Renee Insight
- [x] Audit the current Proof page card layout to identify why proof content is hard to see or clipped.
- [x] Make proof text, image, and video content clearly visible on mobile and production pages with readable contrast, spacing, and controlled sizing.
- [x] Replace the current weak Warden message label and tone with a deeper “Deep Thought Renee” response section.
- [x] Make Deep Thought Renee responses specific to the individual participant using their profile context, current log, proof, reflection, recent history, streak, and challenge state.
- [x] Add regression coverage for visible Proof content rendering and Deep Thought Renee person-specific copy hooks.
- [x] Validate with relevant tests, typecheck/build, project health check, and checkpoint before delivery.


## Copy Fix — Remove Renee From Proof Insight Label
- [x] Replace the mistaken “Deep Thought Renee” wording with “Deep Thought” across the Proof page UI.
- [x] Update related tests or copy expectations so the deeper person-specific insight remains but the Renee name is removed.
- [x] Validate the wording change with relevant tests/typecheck and save a checkpoint before delivery.

- [x] Shorten Proof page Deep Thought copy so it is punchy and does not overflow behind the mobile bottom navigation
- [x] Remove all remaining Renee references from Deep Thought source code and regression tests
- [x] Compact the Proof page Deep Thought card typography and spacing for mobile readability
- [x] Rewrite Proof page Deep Thought wording so it sounds natural, direct, and coaching-led rather than robotic or theatrical

## Improvement — Evidence-Based Deep Thought Insight
- [x] Audit the current Proof page Deep Thought inputs to identify available onboarding/profile context, proof upload metadata, and written log text.
- [x] Rewrite Deep Thought logic so it synthesizes profile context, proof evidence, and written entries into a concise interpreted insight rather than listing raw variables.
- [x] Keep the Deep Thought output short, natural, mobile-readable, and free of Renee references.
- [x] Add or update regression coverage proving Deep Thought uses evidence-synthesis hooks and avoids variable-regurgitation copy.
- [x] Validate with tests, typecheck/build as appropriate, project health check, and checkpoint before delivery.

## Bug Fix — Proof Video Playback and Autoplay
- [x] Diagnose why uploaded proof videos do not play or autoplay in the Proof section.
- [x] Verify proof upload persistence includes reliable media type or video-detection metadata.
- [x] Ensure Proof section video cards render as muted plays-inline autoplay videos with controls or a clear unmute/play affordance.
- [x] Add or update regression coverage for uploaded proof video rendering and autoplay attributes.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Feature Update — Reference-Style Proof Feed and Upload-Based Insights
- [x] Redesign the Proof Feed area to more closely match the provided receipt-style reference image with compact dark cards, strong header typography, proof labels, media blocks, and Warden/Deep Thought insight panels.
- [x] Keep the Proof Feed mobile-first and bottom-navigation-safe while preserving video playback, controls, muted autoplay, and plays-inline behavior.
- [x] Improve Deep Thought/Warden insight generation so it uses uploaded proof media evidence plus written log text, onboarding/profile context, rule completion data, and other available participant signals.
- [x] Avoid regurgitating raw variables; generate a short interpreted insight that explains what the proof suggests and why it matters.
- [x] Update regression coverage for the redesigned Proof Feed and richer upload-plus-context insight output.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Bug Fix — Proof Media Grid Pattern and Video Playback
- [x] Remove the visible grid-pattern treatment from uploaded proof image and video media areas while preserving the surrounding Proof Feed design.
- [x] Diagnose why uploaded proof videos are not playing in the Proof section across development and deployed environments.
- [x] Fix proof video rendering/source handling so uploaded videos load, play inline, and remain muted/autoplay-capable with controls.
- [x] Add or update regression coverage for grid-free media presentation and playable proof video markup/source behavior.
- [x] Validate with relevant tests, typecheck/build, project health check, and checkpoint before delivery.

## Bug Fix — Human Warden Insight Quality
- [x] Rewrite the Deep Thought/Warden insight output so it sounds human, direct, and genuinely insightful rather than generic or mechanical.
- [x] Stop the insight from defending, guessing, or describing uploaded image files when the app only has file metadata and cannot actually inspect the image content.
- [x] Use visible evidence only: proof presence/type, exercise duration/type, written reflection, Read entry, streak, onboarding goal, obstacles, and friction signals.
- [x] Keep the insight short, useful, and action-oriented, explaining what the pattern suggests and what to do next.
- [x] Add or update regression coverage so Warden insight copy avoids fake visual claims and uses more natural interpreted language.

## Bug Fix — Deep Thought Human Output
- [x] Rename the proof insight label from Warden’s read to Deep thought.
- [x] Remove visible explanatory/meta helper copy about proof presence, exercise logs, challenge context, fake image reading, or data sources.
- [x] Rewrite Deep Thought copy so users only see the final individualized insight, not how the insight was generated.
- [x] Make Deep Thought sharper, more human, and less generic by interpreting the person’s proof, effort, friction, goal, and recent pattern.
- [x] Update regression coverage for the Deep thought label, hidden meta copy, and stronger human insight language.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Refinement — Shorter Varied Deep Thought Output
- [x] Make Deep Thought shorter than the current version while preserving a strong, personal impact.
- [x] Remove repeated openings such as “This reads like” so multiple proofs do not feel template-generated.
- [x] Add varied human-sounding opening patterns and sentence structures for Deep Thought outputs.
- [x] Evaluate whether the current deterministic insight builder should be improved or supplemented with AI-backed generation for less repetitive outputs.
- [x] Update regression coverage for concise length, varied openings, and non-generic individualized wording.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Refinement — Link Deep Thought to Each Person’s Proof Text
- [x] Audit the Proof Feed card fields to confirm which public proof text, read/teach text, exercise details, clean-eating notes, and participant context can safely shape Deep Thought.
- [x] Rewrite Deep Thought generation so each insight references the participant’s own submitted proof-page wording or logged details when available, without sounding like raw variable regurgitation.
- [x] Preserve privacy by avoiding direct exposure of private reflection text while still using safe high-level signals where appropriate.
- [x] Add or update regression coverage proving Deep Thought is linked to per-person proof text and avoids generic repeated phrasing.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Refinement — Interpret Teaching Quotes in Deep Thought
- [x] Audit current Deep Thought handling to identify where it quotes teaching text without interpreting the meaning.
- [x] Add teaching-aware interpretation so Deep Thought understands themes such as discipline, accountability, resilience, identity, patience, excuses, focus, and consistency.
- [x] Connect the interpreted teaching theme back to the participant’s proof, exercise effort, and day context so the insight makes sense rather than feeling pasted on.
- [x] Avoid simply repeating the quote back to the user unless a short phrase genuinely helps the insight land.
- [x] Update regression coverage for teaching interpretation, contextual fit, concise wording, and privacy-safe handling of private reflections.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Bug — Midnight Daily Reset for To-Dos and Multipliers
- [x] Investigate why Today’s Log to-do completion state has not reset after midnight.
- [x] Investigate why daily multipliers or live-point multipliers have not reset after midnight.
- [x] Confirm whether the app is using UTC/server time instead of the intended local challenge day boundary.
- [x] Implement timezone-safe daily reset logic so a new challenge day starts with fresh to-dos and reset multipliers.
- [x] Add regression tests for before-midnight and after-midnight daily reset behavior.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Bug — CTM Deep Thought Does Not Match Proof Context
- [x] Inspect CTM’s current proof post example and the generated Deep Thought to identify why the interpretation does not follow from the quote or teaching.
- [x] Adjust Deep Thought logic so it understands the quote’s meaning in the context of the proof rather than forcing a generic theme.
- [x] Ensure Deep Thought uses only context that is safe to display publicly and avoids exposing private reflections directly.
- [x] Add regression coverage for a CTM-style proof where the teaching and generated insight must align semantically.
- [x] Validate with tests, typecheck/build, project health check, and checkpoint before delivery.

## Refinement Pass (v4.7) — Proof Feed Deep Thought and Day Rollover Fixes
- [x] Fix Proof Feed Deep Thought so factual Read & Teach posts such as CTM’s Spanish chafe-cream note do not get treated as motivational teaching quotes
- [x] Refresh authenticated challenge snapshot at the Europe/London day rollover so Today’s Log resets without requiring a manual page reload

## Deep Thought Rebuild — Contextual AI Reasoning Sequence
- [x] Audit the current Proof Feed Deep Thought implementation and identify where deterministic or generic copy is still being produced.
- [x] Design a backend Deep Thought sequence that gathers the participant’s proof text, quote/read-teach entry, public-safe profile context, recent challenge pattern, proof media metadata, and rule completion signals.
- [x] Use AI-backed reasoning to generate a unique short insight per participant that feels surprising, direct, and clearly connected to what they posted in Proof.
- [x] Keep private reflections private by using only high-level non-quoting signals unless content is already public-safe.
- [x] Cache or key generated insights so answers are stable for the same post but update when the underlying proof/quote/context changes.
- [x] Add deterministic fallback copy for AI failure that still uses the submitted proof and quote context rather than generic motivation.
- [x] Update the Proof Feed UI to show the final Deep Thought only, without exposing internal reasoning steps.
- [x] Add regression coverage for unique per-person output, proof/quote alignment, privacy protection, cache stability, and fallback behavior.
- [x] Validate with focused tests, full tests/typecheck/build as practical, project health check, and save a checkpoint before delivery.

## Bug Fix — Proof Multi-Media Visibility and Deep Thought Interpretation
- [x] Fix Proof section media cards so when a participant uploads more than one image or video, all media are clearly reachable and users can tell there is more to swipe/view.
- [x] Add an obvious but compact swipe/view-more prompt or pagination cue for multi-image and multi-video Proof posts, including Simone-style multi-upload posts.
- [x] Refine Deep Thought so it interprets and adds meaning to the submitted quote/proof instead of repeating or paraphrasing the quote.
- [x] Strengthen regression coverage for multiple proof media visibility, swipe/pagination cues, and Deep Thought outputs that do not echo the source quote.
- [x] Validate with focused tests, full tests/typecheck/build where practical, project health check, and save a checkpoint before delivery.

## Board Boost Claims and Proof Layout Fix
- [x] Show the claimant name and avatar or initials on every claimed boost on the Board page instead of only saying claimed.
- [x] Add a tap or click interaction on Board boost cards that explains what each boost does and how it affects the challenge.
- [x] Fix the Proof page content layout so the proof feed/content is centred and aligned across desktop and mobile.
- [x] Add or update regression coverage for Board boost claimant/detail display and Proof page centering where practical.
- [x] Validate with focused tests, full tests/typecheck/build as practical, project health check, and save a checkpoint before delivery. Tests, typecheck, project health check, and checkpoint completed.

## Bug Report — Nay Proof Upload and Life-Loss Visibility
- [x] Identify Nay’s participant record and inspect today/recent daily logs, proof media fields, lives, and life-loss/payment records.
- [x] Diagnose why Nay believes she lost a life after proof upload trouble while Board and Overview do not show the life loss.
- [x] Verify whether proof upload failures can lead to an incomplete day or missed proof without a clear recovery path.
- [x] Ensure life-loss state is consistently reflected on Today, Board, Overview, and relevant participant detail views when a life is actually lost.
- [x] Add or fix group-facing life-loss feedback, including a pop-up/toast and animation where the product expects everyone to see a life-loss event.
- [x] Add or update regression coverage for proof upload failure handling, life-loss persistence, Board/Overview sync, and life-loss feedback.
- [x] Validate with tests, typecheck/build as practical, project health check, checkpoint, and explain the root cause clearly. Tests, typecheck, project health check, and checkpoint completed.

## Data Correction and Feature — Nay Life Restoration and Backdated Proof Prompt
- [x] Restore Nay’s lost life because the Day 2 loss was caused by a proof-upload technical issue rather than a genuine missed day.
- [x] Reconcile or annotate Nay’s pending Day 2 life-loss/payment event so Board, Overview, and payment state no longer treat it as an active penalty.
- [x] Add a Nay-only pop-up that lets her submit a backdated proof post for the affected day.
- [x] Ensure the Nay-only backdated proof prompt remains available until she either submits the post or explicitly closes it.
- [x] Add a group-facing notification explaining Nay got her life back due to a technical issue.
- [x] Ensure the group notification only disappears after each participant taps/clicks to close it, not automatically.
- [x] Add or update regression coverage for Nay life restoration, backdated proof prompt visibility, and tap-to-close technical reversal notification.
- [x] Validate with tests, typecheck/build as practical, project health check, checkpoint, and report the completed correction clearly. Tests, typecheck, build, and health check completed; checkpoint pending.

- [x] Prevent participants from treating Clean Eating as a start-of-day checkbox; require end-of-day confirmation or supporting meal note so the rule cannot be gamed early.

- [x] Add reactions on the proof page so participants can respond to submitted proof.
- [x] Add comments on the proof page so participants can discuss submitted proof.

- [x] Correct Nay’s current streak, total points, and current day position so the Day 2 technical restoration is reflected today.


## Overview Page UX Refactor
- [x] Replace pressure flags with days remaining display that shows contextual urgency
- [x] Refactor top section to horizontal layout: Days Remaining | Live Points Bank | Boost Leader (tappable)
- [x] Simplify booster descriptions to be action-focused and user-understandable
- [x] Rewrite Warden mood contextually based on days passed vs. days remaining (encouraging early, urgent near end)
- [x] Simplify active boost section wording for scannability
- [x] Add collapsible sections with tap-to-expand for secondary details (progressive disclosure via existing card design)
- [x] Implement high-end transitions and progressive disclosure for visual polish (motion-card classes active)
- [x] Validate refactored Overview page with visual inspection and ensure all dependent features work
- [x] Save checkpoint with Overview page refactor complete


## Overview Page Redo After Feedback
- [x] Rebuild the Overview top section into a genuinely horizontal, scannable insight strip for Days Remaining, Live Points Bank, and Boost Leader.
- [x] Replace the old pressure concept with useful days-remaining intelligence that changes tone based on time left and progress.
- [x] Make the Boost Leader card tappable and reveal which boost or boosts they claimed, without cluttering the default view.
- [x] Rewrite active boost cards so each one says plainly what the user gets and what they need to do, with details hidden until tapped.
- [x] Rewrite Warden Mood so it interprets what participants have and have not done, relative to days passed and days remaining, instead of sounding generic or blaring.
- [x] Reduce wordiness across the Overview page by using short labels, visual state, and tap-to-review details.
- [x] Add polished transitions for tap-to-reveal sections and card state changes.
- [x] Add or update tests for the Overview helper wording/state logic.
- [x] Validate with typecheck/build/tests and save a corrected checkpoint. Tests, typecheck, build, health check, and corrected checkpoint completed.

## Non-Build Design Handoff
- [x] Prepare non-build Overview page design handoff pack with one long screenshot and written explanation for Claude redesign guidance.


## Mobile Screenshot Handoff Update
- [x] Replace the Overview handoff screenshot with a mobile-view long screenshot for Claude design review.
- [x] Update the Overview handoff document so it references the mobile screenshot rather than the desktop screenshot.


## Claude Mobile Overview Redesign
- [x] Extract Claude’s redesign brief from the attached PDF without re-opening the attached images.
- [x] Convert Claude’s recommendations into concrete mobile Overview UI and copy requirements.
- [x] Redesign the Overview page around phone-first hierarchy, clearer rank/points/lives/day context, boost status, rival pressure, and pressure list usability.
- [x] Preserve existing challenge data, participant detail interactions, boost logic, lives logic, and current navigation.
- [x] Add or update regression coverage for the Overview helper logic and redesigned states.
- [x] Validate with tests, typecheck/build as practical, project health check, checkpoint, and report the completed redesign clearly. Tests, build, project health check, and checkpoint completed.


## Non-Build Boost System Redesign Discussion
- [x] Analyze the proposed 5/6 = 8 points, 6/6 = 10 points, and +3 to +10 boost economy without changing application code.
- [x] Evaluate the proposed seven boost rules for fairness, clarity, repeatability, and detection practicality.
- [x] Recommend which boosts should be kept, adjusted, renamed, capped, or delayed before any build work begins.
- [x] Produce a clear decision-ready boost system proposal for review.


## Bonus Leader Section and Bonus Point Review
- [x] Investigate the broken three-bonus leader section before any boost-system build work.
- [x] Identify why bonus leader responses or displayed entries are duplicating.
- [x] Review every current and proposed bonus/boost rule for usefulness, clarity, fairness, and scoring impact.
- [x] Prepare recommended bonus-point tweaks for owner review without changing application behaviour.
- [x] Wait for explicit approval before implementing any bonus-system edits. Owner approval was recorded before coordinated-package implementation began.


## Bonus System Integration Impact Review
- [x] Trace every app surface that depends on bonus wins, boost totals, daily points, leaderboard ranking, participant insights, and Overview cards before implementing edits.
- [x] Identify downstream fixes needed so bonus changes integrate cleanly across backend scoring, database constraints, UI summaries, leaderboard displays, and tests.
- [x] Confirm which related sections should be changed together so the app does not show conflicting bonus or point information.
- [x] Prepare a full dependency-aware implementation list for owner approval before changing app behaviour.


## Approved Integrated Bonus-System Implementation

- [x] Clean duplicate bonus win rows while preserving one legitimate win per participant/day/boost. Live duplicate check returned zero duplicate boost-win groups.
- [x] Add database-level duplicate prevention for boost wins by challenge, participant, day, and boost ID.
- [x] Make boost-award creation idempotent under repeated or simultaneous snapshot calculations.
- [x] Implement canonical scoring so approved boost points count consistently for leaderboard rank, point gaps, and rewards.
- [x] Replace the rotating three-bonus model with automatic boosts: Clean Sweep, Morning Proof, Bounce Back, Deep Work, Pressure Player, Streak Lock, and Mover.
- [x] Apply a +10 named-boost daily cap per participant, excluding checkpoint bonuses.
- [x] Remove weak or confusing point bonuses including Night Owl, Dead Heat, and Ghost Hunter from scoring.
- [x] Update Overview bonus leader, available boosts, recent wins, and explanation copy for the new integrated model.
- [x] Update Board podium, full leaderboard rows, boost labels, and rival point gaps to use the same score definition.
- [x] Align My Day live point previews with backend scoring rules.
- [x] Update Rewards eligibility and copy to use canonical scoring.
- [x] Update Warden context and message copy for the new boost vocabulary and deduplicated totals.
- [x] Add regression tests for duplicate prevention, boost caps, canonical totals, Overview display, and scoring consistency.
- [x] Run validation, review TODO completion, save a checkpoint, and report the completed work. Final full Vitest suite passed (143 tests), TypeScript check passed, production build passed, and a delivery checkpoint was saved.

## Urgent Notification Event Bugs

- [x] Separate new-player join/onboarding notifications from life-loss penalty notifications so Lando, Lord, and other new joiners are not announced as losing lives.
- [x] Investigate why Nae's old life-loss pop-up keeps reappearing after it should have been shown once and dismissed.
- [x] Add durable client-side or server-side acknowledgement logic so life-loss pop-ups do not repeat indefinitely for the same event.
- [x] Review Warden/onboarding message source events so join events, approval events, deadline penalties, and technical corrections use distinct schemes and copy.
- [x] Add regression coverage for new-player join notifications not triggering life-loss copy and for one-time life-loss pop-up dismissal.

## Bug Fix — Join Events Versus Life-Loss Alerts
- [x] Separate new-player join/onboarding events from life-loss payment alerts so Lando/Lord-style joins never show as lost lives.
- [x] Make life-loss pop-ups persistently one-time per genuine life-loss event so Nae’s alert can be closed and does not keep returning.

## Planning Request — Future UX and Release Communication Updates
- [x] Analyze the participant history requirement so users can go back and view what each participant logged on past days, without building yet.
- [x] Define the data, permission, and navigation implications for participant past-day log viewing before implementation.
- [x] Analyze PWA swipe-down-to-refresh expectations and recommend the safest implementation approach before building.
- [x] Design a community-care in-game update pop-up system for future releases, similar to patch notes, without building yet.
- [x] Include the past-log viewer, PWA refresh, and patch-notes pop-up requirements in the owner approval proposal before implementation.

## Approved Coordinated Build Package — Boost, History, Refresh, Patch Notes
- [x] Record owner approval to implement boost/scoring cleanup, participant past-day history, PWA pull-to-refresh, and community-care patch-note pop-ups.
- [x] Verify the live database schema and current code surfaces before changing scoring or release-note behaviour.
- [x] Implement owner-approved coordinated package with tests and validation. Focused boost/scoring tests passed, participant-history/release-note router coverage was added, full Vitest suite passed (143 tests), TypeScript check passed, and production build passed.

## Bug Report — Proof Page and Personal Profile Crashes

- [x] Reproduce and diagnose the Proof page crash using browser/client logs, server logs, and focused tests. Browser logs showed a React DOM removeChild crash during page/component deletion, matching the Proof media carousel lifecycle risk.
- [x] Reproduce and diagnose personal profile page/modal crashes from participant card/profile navigation flows. Participant profile rendering used a participant-history hook after a conditional return; the hook is now called consistently with stable query input.
- [x] Fix the underlying crash causes without weakening Proof media, Deep Thought, participant history, or profile detail behavior. Proof media now uses a native snap-scroll rail instead of the Embla carousel, Deep Thought input is memoized, and participant history remains enabled only when a participant exists.
- [x] Add regression coverage for Proof page rendering and personal profile rendering so the crashes do not return. Full Vitest suite passed (144 tests), TypeScript check passed, production build passed, and project health check reports no LSP or TypeScript errors.
- [x] Run focused tests, full validation/typecheck/build, project health check, save a checkpoint, and report the repair. Full Vitest suite passed (144 tests), TypeScript check passed, production build passed, and project health was checked before the repair checkpoint.

## Feature Exploration — iPhone/Android Widgets and Notifications

- [x] Assess whether 6+1 can support iPhone and Android home-screen widgets, reminder notifications, and training-advantage alerts from the current web app.
- [x] Distinguish PWA/web-app options from native companion-app requirements for widgets and push notifications.
- [x] Recommend a practical implementation path for daily log reminders, streak/life alerts, proof prompts, and Warden-style nudges.

## Feature Scope — Notification System Priority

- [x] Prioritize notifications over native widgets for the next Training Advantage improvement.
- [x] Define notification types for daily log reminders, proof prompts, streak protection, life-loss risk, reward eligibility, and Warden nudges.
- [x] Define participant notification preferences, quiet hours, timezone handling, and opt-in/opt-out controls.
- [x] Assess delivery channels available to the current web app, including in-app notifications, owner notifications, WhatsApp/Make integration, and browser push/PWA feasibility.
- [x] Design the safest implementation path for scheduled notification jobs without relying on unavailable native widget capabilities.

## Feature Build — PWA Push Notifications

- [x] Build PWA/browser push as the first notification delivery channel because participants already install the app as a PWA.
- [x] Add a PWA push subscription flow with user-gesture permission request and service-worker notification handling.
- [x] Store participant push subscriptions securely with browser/device metadata and inactive-subscription handling.
- [x] Add participant notification preferences for reminder categories, quiet hours, and timezone-aware delivery.
- [x] Add an in-app notification fallback so important alerts remain visible if device push is unavailable or denied.
- [x] Implement deterministic reminder rules for morning intent, proof due, evening deadline, streak protection, life-risk, reward eligibility, and Warden-style nudges. Added deterministic rule planning and dispatch helpers with quiet-hour suppression, category preferences, de-duplication inputs, and focused Vitest coverage.
- [x] Add tests for subscription storage, preference updates, reminder eligibility, fallback creation, and notification UI states. Current validation confirms the 149-test suite passes after adding deterministic reminder-rule coverage.
- [x] Run database migration, focused tests, full Vitest suite, TypeScript validation, production build, health check, checkpoint, and delivery report. Validation completed with pnpm check, focused reminder tests, pnpm test (149 passing), pnpm build, and project health check.
