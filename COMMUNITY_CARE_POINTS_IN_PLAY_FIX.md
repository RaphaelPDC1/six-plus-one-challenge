# Community Care Note: Points in Play Display Fix

**Date:** May 11, 2026  
**Issue:** Points in Play display on My Day screen was showing base points only, excluding boost bonuses  
**Status:** ✅ Fixed and validated

## What Was Wrong

The "Points in Play" metric on the My Day screen was calculating projected points as:
```
base_points + today's_live_task_points
```

This excluded all boost bonuses earned on previous days, creating a mismatch with the leaderboard total that participants saw on the Board tab. When someone earned a boost, their leaderboard rank would jump, but the My Day screen wouldn't reflect the new total until they submitted a new daily log.

## What We Fixed

Updated the calculation to include all earned boost points:
```
base_points + today's_live_task_points + accumulated_boost_points
```

Now the "Points in Play" display shows the complete, accurate total that matches the leaderboard immediately after earning any boost.

## Technical Details

- **File:** `client/src/pages/Home.tsx` (MyDay component)
- **Change:** Added boost points aggregation from `snapshot.boostWins` filtered by current participant
- **Validation:** All 31 existing tests pass, TypeScript check clean, production build successful

## User Impact

✅ **Immediate:** Participants now see their true total points on the My Day screen, including all boosts  
✅ **Transparency:** Removes confusion about why the leaderboard showed a different number  
✅ **Fairness:** Ensures the displayed "Points in Play" always matches what determines their rank

## Testing Notes

- Focused regression test suite confirms the fix works with and without boost wins
- Swipe navigation exclusion zones remain intact (no regression)
- Daily submission cache patching still works correctly
- No impact on scoring calculation or leaderboard assembly

---

*This fix ensures scoring accuracy and transparency across all participant-facing displays.*
