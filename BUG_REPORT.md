# Bug Report & Issues Found

## Critical Issues

### 1. **Test Failures After GitHub Edits** ⚠️
- **Location:** `server/pwa.layout.test.ts` and `client/src/pages/Home.onboarding.test.tsx`
- **Issue:** Tests are failing because the GitHub cleanup removed dev labels from the Proof feed, but the tests still expect them.
- **Tests failing:**
  - `Home onboarding shell > keeps the Proof v2 feature layer above the preserved normal feed` — expects "Full proof cards, comments, reactions…" but it's been removed
  - `PWA and mobile layout refinements > adds a reduced-motion-safe site-wide motion system` — expects `motion-calendar-cell` CSS class but it's been removed
- **Fix:** Update the test assertions to match the new cleaned-up code (remove the dev label expectations)

### 2. **Unique Constraint Violation on boost_wins** ⚠️
- **Location:** Database logs show: `Error: Duplicate entry '?' for key 'boost_wins.boost_wins_unique_award_idx'`
- **Issue:** The unique constraint on `boost_wins(challengeId, userId, day, boostId)` is being violated, likely due to duplicate award attempts or a race condition in the boost logic
- **Impact:** Boost awards may not be recorded correctly; participants may see inconsistent point totals
- **Fix:** Check the boost award logic in `server/routers.ts` for duplicate insertion attempts

## Medium Priority Issues

### 3. **Hardcoded `any` Types in Warden Module**
- **Location:** `server/warden.ts`, `server/warden/wardenRouters.ts`, `server/warden/messageGenerator.ts`
- **Issue:** Multiple `any` type casts that could hide type errors
- **Examples:**
  - `participants.map((p: any) => ...)`
  - `logs.slice(0, 25).map((l: any) => ...)`
  - `payments.filter((p: any) => ...)`
- **Risk:** Type safety is lost; refactoring could introduce bugs
- **Fix:** Replace `any` with proper types from the schema (Participant, DailyLog, PaymentEvent, etc.)

### 4. **Unsafe Property Access in Payment/Reward Logic**
- **Location:** `client/src/pages/Home.tsx` lines 1386-1410
- **Issue:** Code accesses `data.complete`, `data.missedRules`, `data.url`, `data.mediaType` without null checks
- **Risk:** If the API returns unexpected shape, the component could crash
- **Fix:** Add explicit null coalescing: `data?.complete ?? false`, `data?.url ?? null`

### 5. **Missing Error Handling in LLM Calls**
- **Location:** `server/autoReleaseNote.ts`
- **Issue:** LLM call failure is caught but only logged; no fallback message is generated
- **Impact:** If LLM fails, participants see no release note at all
- **Fix:** Generate a simple fallback release note if LLM fails (e.g., "System Update — Stability improvements")

## Low Priority Issues

### 6. **Console Logs Left in Production Code**
- **Location:** `client/src/pages/ComponentShowcase.tsx:197` — `console.log("Dialog submitted with value:", dialogInput);`
- **Fix:** Remove or wrap in `if (process.env.NODE_ENV === 'development')`

### 7. **Unused CSS Class**
- **Location:** `motion-calendar-cell` was removed from Calendar but may be referenced elsewhere
- **Fix:** Verify no other components reference this class

### 8. **Potential Race Condition in Daily Log Finalization**
- **Location:** `server/db.ts` — `finalizePreviousDayIfNeeded`
- **Issue:** Although we added a unique constraint, the in-code guard could still allow two concurrent requests to both pass the check before either inserts
- **Fix:** Use database transaction isolation level `SERIALIZABLE` for the finalize operation

### 9. **Missing Validation on Proof Upload Size**
- **Location:** `server/routers.ts` — uploadProof procedure
- **Issue:** Although we raised the limit to 50MB, there's no check for actual file size before base64 encoding
- **Risk:** Very large files could cause memory issues during base64 conversion
- **Fix:** Add a pre-upload size check on the client (already done) and validate on server before decoding

### 10. **Incomplete Error Messages in UI**
- **Location:** `client/src/pages/Home.tsx` — various toast messages
- **Issue:** Some error messages are generic ("Could not send a test notification") without context
- **Fix:** Add specific error details from the API response

## Data Integrity Issues

### 11. **Leaderboard Points Calculation**
- **Location:** `server/routers.ts` — leaderboard query
- **Issue:** Although the GitHub cleanup fixed the display, verify the `canonicalTotalPoints` calculation includes all boost sources
- **Fix:** Audit all boost types and ensure they're all included in the calculation

### 12. **Life Loss Duplicate Prevention**
- **Location:** `server/db.ts` — unique constraint now in place
- **Issue:** Although we fixed it, verify no existing duplicates remain in the database
- **Fix:** Run a cleanup query to remove any remaining duplicates before the constraint is applied

## Recommendations for Claude Code

1. **Fix test assertions first** — the two failing tests need to be updated to match the cleaned-up code
2. **Type the Warden module** — replace `any` types with proper schema types
3. **Add null checks** — especially in Home.tsx payment/reward logic
4. **Add LLM fallback** — generate a default release note if LLM fails
5. **Audit boost logic** — investigate the unique constraint violation on boost_wins
6. **Remove console logs** — clean up debug statements before production
7. **Add transaction isolation** — use SERIALIZABLE for critical finalization operations

## Test Coverage Gaps

- No tests for the auto release note system's LLM failure path
- No tests for concurrent proof uploads (race conditions)
- No tests for boost award deduplication
- No tests for payment event deduplication edge cases
