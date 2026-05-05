# Mobile logo validation notes

Two 390px-wide Chromium screenshots were captured against the live preview after the CSS overlay fix. The mobile public landing view shows a single top-left 6+1 brand mark and no duplicate loading mark stacked over it. The landing content remains within the mobile viewport width, with the expected preview/publication banner at the bottom of the sandbox preview.

The attempted short virtual-time screenshot had already advanced to the landing state in headless Chromium, so it did not capture the transient loading overlay. The automated CSS regression test now verifies that the loading screen is a fixed, high-z-index overlay using `100dvh`, and the static markup test verifies the loading branch does not render the sticky app header at the same time.

A later 390px screenshot and CDP width diagnostic were captured after the header wrapping fix. The diagnostic reported `documentScrollWidth: 390`, `bodyScrollWidth: 390`, and no horizontal overflow after the decorative background numeral was moved inward. The logo and top tagline were distinct and non-overlapping, but the bold hero sentence still looked visually cramped at the 390px breakpoint because it was promoted to `text-xl`; the final patch keeps that sentence at the smaller mobile size until the `sm` breakpoint for clearer wrapping.

The final typography screenshot still showed the hero sentence cramped at the right edge even though the CDP diagnostic reported no document overflow. To make the mobile result unambiguous visually, the sentence should be split into explicit short lines on mobile rather than relying only on automatic wrapping.

After explicit mobile line spans were added to the hero sentence, the 390px screenshot shows the top logo/tagline separated, the loading/header logo issue resolved, and the hero sentence split into short readable lines: "50 days. Make it count.", "Remember you're", and "not a civilian." The CDP diagnostic still reports `documentScrollWidth: 390`, `bodyScrollWidth: 390`, and an empty overflow list.
