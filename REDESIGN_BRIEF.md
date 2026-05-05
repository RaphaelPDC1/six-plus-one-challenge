# 6+1 4 Lives — Front-End Redesign Brief

## Status

This brief is now locked as a **front-end-only redesign direction**. The current v1 backend, schema, life-loss logic, Monzo payment flow, WhatsApp persistence, Warden scaffolding, authentication, tRPC procedures, and database helpers must remain untouched unless the user explicitly approves a backend change later.

The visual source of truth is the participant-poster aesthetic and the Claude artifact mockup supplied by the user.[^1] Earlier Framer, 21st.dev, shadcn/ui, Sonner, and animation references are useful only where they support this exact look and feel. They must not soften the interface or pull it back into generic SaaS/dashboard territory.

> **Design command:** This is not a dashboard. It is a challenge interface with consequences. Every screen should communicate tension, progress, or reward. Never neutral.

## Locked Aesthetic

The app must feel like the participant poster translated into an interactive mobile product. The design language is dark, sharp, typographically heavy, and compressed without feeling cluttered. There should be no white cards, no grey dashboard panels, no soft rounded cards, no pastel gradients, and no wasted padding.

| Design Element | Locked Direction | Implementation Rule |
|---|---|---|
| Base color | Near-black, close to `#0D0D0D` | Body, route backgrounds, nav, panels, and cards should all inherit the black system |
| Primary accent | Warm gold, close to `#C8A96E` | Use for active state, reward, submit, rank-one treatment, progress, and key typography highlights |
| Danger / lives | Deep red, close to `#C0392B` | Use for lives, Warden triggers, warnings, life loss, and critical states |
| Completion | Green, close to `#2ECC71` | Use for completed rule rows, ticks, success states, and confirmed logs |
| Ghost Life | Purple, close to `#9B59B6` | Use only for Ghost Life indicators so it remains special |
| Shape language | Sharp rectangular geometry | Remove border-radius from participant-facing cards, buttons, badges, checkboxes, health bars, and nav states |
| Typography | Heavy uppercase hierarchy | Use 800–900 weight headings, tiny uppercase labels, tight tracking, and high contrast |
| Borders | Thin hard separators and 2px grid gaps | Use parent-grid border-color gaps where useful, matching the poster card system |
| Spacing | Compact and purposeful | No dashboard padding waste; every block should feel intentional and high-pressure |

## Information Architecture

The participant flow must open directly into **Today’s Log**. Overview, leaderboard, feed, rewards, and founder tools are secondary. The participant should feel that logging the day is the first action and the gateway to the rest of the experience.

| Route / Tab | Priority | Required Feeling |
|---|---:|---|
| Today’s Log | Primary | Immediate accountability and stakes |
| Group / Overview | Secondary | The group is alive; others are moving |
| Leaderboard | Secondary | Competitive pressure and social comparison |
| Proof Feed | Secondary | Public accountability and receipts |
| Rewards | Secondary | Progress has value |
| Founder / Admin | Utility | Functional, but still visually consistent |

## Screen 1 — Today’s Log

Today’s Log is the default authenticated participant screen. It should match the Claude artifact’s narrow mobile-first interface: hard black background, compact rule rows, gold title underline, red segmented lives, proof badges, square checkboxes, and bottom navigation.[^1]

The health bar must be one of the first things the participant sees. It should be segmented into four sharp rectangular red blocks. If the current design has any “4/4 lives” pill, number badge, dots, or soft status display, it must be replaced with this segmented health bar. When a life is lost, the target segment should briefly pulse red, shake, then drain to dark.

| Today’s Log Element | Required Behaviour |
|---|---|
| Header | Shows day count, Today’s Log title, red segmented lives, and a thin gold progress line |
| Rule rows | Six rules appear as tappable dark rows or sharp cards with separators |
| Proof badges | Small uppercase dark-tinted badges with colored borders: red honour, green photo, gold text/WhatsApp, grey auto |
| Rule completion | Completed rows shift to dark green, rule text strikes through, and a gold/green tick animates in |
| Auto rule | “Track Everything” may auto-complete after the manual rules; UI must still explain this clearly as six addressed rules |
| Submit | Gold, sharp, uppercase button; disabled until all required rules are addressed |
| Bottom stats | Current streak and lives remain visible after the rule list, not hidden in a dashboard |

## Screen 2 — Post-Submit Moment

Submitting the day must not feel like a page refresh. It needs a short reward moment. Use a sharp “Dynamic Island”-style action bar or banner, then show the day complete state with points ticking upward, streak confirmed, and lives intact. The Warden can deliver a one-line response as a toast or fixed message.

| Moment | Interaction |
|---|---|
| Submit pressed | Short haptic pulse on mobile where supported |
| Success state | Gold action banner appears: “Day 12 Complete” |
| Points | Odometer-style count from old total to new total |
| Streak | Green success state confirms the streak |
| Warden | Short typewriter message or toast acknowledges the day |

## Screen 3 — Group / Overview

The group overview should not feel like a dashboard summary. It should feel like surveillance of a live challenge. The Warden card sits near the top with a red left border and pulsing red dot. The lives grid uses compact dark cells, colored avatars or initials, and mini health bars. The insights marquee and activity feed make the group feel active.

| Overview Element | Required Treatment |
|---|---|
| Warden card | Dark red-tinted card, red left border, pulsing red dot, direct copy |
| Lives grid | 2px border-gap grid, compact participant cells, mini segmented health bars |
| Insights | Horizontal marquee with short participant reflections |
| Activity | Compact timestamped feed, dark rows, gold/green badges |

## Screen 4 — Leaderboard

The leaderboard should feel competitive and tappable. The user has asked for plotted people and alive interaction, while the Claude mockup provides a sharper row-based version. The final design should combine these: use a visual race/line-graph treatment where practical, and keep the poster-style ranked rows as the fallback or mobile compact state.

Tapping a participant must reveal more information. On mobile, prefer a bottom drawer or native-feeling sheet if the row expansion becomes cramped. On wider screens, an expanded row or side panel can work.

| Leaderboard Element | Required Treatment |
|---|---|
| Rank one | Gold callout treatment or gold left border |
| Rows | Dark, sharp, compact, tappable, with mini health bar and points |
| Expanded stats | Streak, days, lives, points, recent activity, Ghost Life if used |
| Chart mode | Multi-person colored line graph when data supports it |
| Tap interaction | Opens bottom sheet on mobile or inline/side detail on larger screens |

## Screen 5 — Proof Feed

The proof feed should feel like evidence, not a social media wall. Rows are timestamped, compact, and hard-edged. Photo proof should use dark placeholders or thumbnails with clear proof labels. Read-and-teach insights can be italicized, but they should stay inside the same high-stakes visual system.

| Proof Feed Element | Required Treatment |
|---|---|
| Participant identity | Initial/avatar block with participant color |
| Rule badge | Small uppercase badge matching proof type |
| Photo proof | Sharp dark media block, no rounded thumbnail styling |
| Notes | White or muted text with high readability |
| Time | Tiny uppercase/muted timestamp |

## Persistent Warden Presence

The Warden should not be buried. It should appear as a fixed or recurring presence in Today’s Log, Group, and post-submit states. It should speak in short, direct lines. Visually, it uses red: red left border, red dot, red trigger labels, and dark red-tinted surface.

## Component and Interaction Stack

The implementation should stay native to the existing React/Tailwind app. Component-library inspiration is allowed, but only if it is reskinned to the poster aesthetic.

| Need | Preferred Approach |
|---|---|
| Base UI | Existing React + Tailwind + shadcn/ui primitives where they can be restyled sharply |
| Toasts | Sonner-style custom dark toasts for Warden messages, milestones, and life-loss alerts |
| Animation | Lightweight CSS transitions and Framer Motion-style patterns where already compatible |
| Haptics | `navigator.vibrate()` for supported mobile browsers on tick, submit, and life-loss events |
| Charts | Existing chart dependency if present, or lightweight chart integration only if needed for line leaderboard |
| Bottom sheet | shadcn drawer/dialog pattern or custom fixed bottom panel, styled with sharp poster geometry |

## Non-Negotiable Scope Constraints

This pass must remain front-end-only. The implementation may reorganize routes, components, layout, CSS variables, visual states, and client-side interactions, but it must not alter the backend contract.

| Do Not Touch | Reason |
|---|---|
| Database schema | v1 data model is already functional |
| Supabase/MySQL persistence assumptions | Participant data and logs must remain compatible |
| Life-loss calculation | Game rules are already approved |
| Monzo payment trigger logic | Payment confirmation remains offline/manual in v1 |
| WhatsApp webhook persistence | Existing logging pipeline must remain stable |
| Warden scaffolding | Only presentation changes are allowed unless separately approved |
| tRPC contracts | Front-end should consume existing procedures rather than redesign data flow |

## Implementation Phases

| Phase | Work | Completion Criteria |
|---|---|---|
| 1 | Visual system | Global dark theme, typography, colors, sharp geometry, no-radius participant UI |
| 2 | Participant routing | Authenticated participant lands on Today’s Log by default |
| 3 | Today’s Log | Red segmented health bar, compact rule rows, proof badges, completion states, gated submit |
| 4 | Micro-interactions | Tick animation, haptics, submit reward moment, Warden toast/banner |
| 5 | Group / Overview | Warden card, lives grid, insights marquee, activity feed restyled |
| 6 | Leaderboard | Alive/tappable leaderboard, stats drawer or expansion, chart/race treatment if data supports it |
| 7 | Proof Feed and polish | Proof feed restyle, responsive states, accessibility, Vitest updates, build validation |

## Final Build Instruction

Build from the Claude artifact and poster mockup, not from a generic dashboard pattern. The correct output should feel like opening a serious challenge HUD: black, sharp, gold, red, compressed, direct, and alive.

## References

[^1]: [Claude public artifact: “6+1 4 Lives — Habit Tracking App UI Mockup”](https://claude.ai/public/artifacts/97062d42-bdc2-4f41-a470-08f5975a63d3)
