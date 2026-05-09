# Non-Build Boost System Recommendation

## Summary

The proposed direction is fundamentally right: the challenge should treat the six daily rules as the main scoring engine, while boosts add competitive tension, catch-up moments, and extra motivation. The current abstract boost names and unclear timing mechanics create friction because participants cannot easily understand what they need to do, whether the app can verify it, or whether the bonus is fair.

The strongest version of the system is a **behaviour-detected bonus layer**. Participants should not need to manually claim boosts. The app should award them automatically when a participant’s daily submission or proof activity satisfies a clear condition. This keeps the system fair, reduces arguments, and makes boosts feel earned rather than arbitrary.

## Recommended Point Economy

| Scoring Event | Recommended Points | Reasoning |
|---|---:|---|
| Complete 5 of 6 rules | 8 pts | Gives a meaningful score for a strong but imperfect day without making it equal to a perfect day. |
| Complete 6 of 6 rules | 10 pts | Keeps the six rules as the main engine of the challenge. |
| Standard daily boost | +3 pts | Adds motivation without overpowering the base rules. |
| Strong streak or comeback boost | +5 pts | Rewards meaningful consistency or resilience. |
| Weekly elite boost | +10 pts | Creates a major weekly target, but should be limited to once per calendar week. |

This structure means a normal perfect day remains worth **10 points**, and a boosted perfect day usually becomes **13–15 points**. That is enough to matter when participants are close, but not so much that boosts become more important than the core challenge.

## Boost Review

| Proposed Boost | Keep / Adjust | Recommendation |
|---|---|---|
| Clean Sweep, +5 | Keep, but clarify repeat logic | Award after 3 consecutive 6/6 days. It should be repeatable only after the streak breaks and rebuilds, or every third day within a longer streak if you want higher scoring. Choose one rule before building. |
| Early Riser, +3 | Keep, but rename slightly | This works if it is tied only to **exercise proof uploaded before 09:00**, not the final nightly submission. Rename to **Morning Proof** if you want it to be clearer. |
| Consistency King, +5 | Keep, but consider naming | Award for 7 consecutive 6/6 days. Strong and fair. Could be renamed **7-Day Lock-In** to fit the app tone. |
| Deep Thinker, +3 | Keep | Good daily boost. It rewards quality reflection, and the 150-character threshold is measurable. |
| Teach the Room, +3 | Keep | Good daily boost. It reinforces the Read and Teach rule and encourages useful insights. |
| Ghost Slayer, +5 | Keep as rare comeback boost | This finally makes the ghost/lives idea make sense. It should only trigger when someone has 2 lives or fewer and completes a full 6/6 day. |
| Iron Week, +10 | Keep, but cap weekly | Strong aspirational boost. Award once per Monday–Sunday calendar week only. |

## Key Design Decision Still Needed

The main unresolved issue is whether streak boosts stack. For example, on the seventh perfect day, a participant might qualify for both **Clean Sweep** and **Consistency King**, and if it is Sunday, potentially **Iron Week** too. That could create a very large points spike.

My recommendation is to allow stacking only when the boosts represent different behaviours, but cap boost points per day. A clean rule would be: **maximum boost points per day = +10**. This allows big moments while preventing the leaderboard from being distorted by one day.

## Recommended Final Boost Set

| Boost | Points | Trigger | Frequency | Fairness Level |
|---|---:|---|---|---|
| Clean Sweep | +5 | Three consecutive 6/6 days | Repeatable after each new 3-day run or after reset, depending final rule | High |
| Morning Proof | +3 | Exercise proof uploaded before 09:00 | Daily | Medium-high |
| 7-Day Lock-In | +5 | Seven consecutive 6/6 days | Repeatable after streak breaks and rebuilds | Medium |
| Deep Thinker | +3 | Reflection exceeds 150 characters | Daily | High |
| Teach the Room | +3 | Read and Teach insight exceeds 100 characters | Daily | High |
| Ghost Slayer | +5 | 6/6 day while on 2 lives or fewer | Situational | Rare |
| Iron Week | +10 | 6/6 every day Monday through Sunday | Once per calendar week | Medium-hard |

## Recommendation Before Building

Before any build work starts, the owner should decide three things. First, decide whether **Clean Sweep** pays every three perfect days during a long streak or only after a streak resets. Second, decide whether daily boost stacking is allowed, and if so whether the daily boost cap should be **+10**. Third, confirm whether **Morning Proof** should require photo/video proof specifically or whether any exercise log before 09:00 qualifies.

My view is that the strongest version is: **base points first, auto-detected boosts second, max +10 boost points per day, no manual claiming, and no abstract names without plain-English explanations.**
