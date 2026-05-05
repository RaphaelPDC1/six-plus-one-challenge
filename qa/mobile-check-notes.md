# Mobile Responsive Check Notes

Date: 2026-05-05

The app was checked in sandbox Chromium at two mobile-sized viewports as the available substitute for physical-device QA:

| Viewport | Screenshot | Observation |
|---|---|---|
| 390 × 844, iPhone-sized | `qa/mobile-iphone-390x844.png` | The animated entry page scales correctly; the heavier ghosted `6+1` mark dominates the dark background without obscuring the centered loading panel. Text remains readable. |
| 412 × 915, Android-sized | `qa/mobile-android-412x915.png` | The animated entry page remains centered and readable; scan-line texture and oversized mark are visible at mobile scale. |

Haptics were validated through the focused Vitest coverage in `client/src/lib/haptics.test.ts`, which verifies safe fallback behavior and expected vibration patterns. Actual physical haptic feedback still depends on device/browser support for `navigator.vibrate()`.
