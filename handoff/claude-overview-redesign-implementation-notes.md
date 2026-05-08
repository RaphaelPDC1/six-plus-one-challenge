# Claude Mobile Overview Redesign — Implementation Notes

Claude’s brief asks for a phone-first Overview page redesign that keeps the existing challenge data but changes the hierarchy so the first question answered is: **what should I do right now?** The intended order is a sticky position strip, a Next Best Move directive, Challenge State, collapsible Room Summary, Warden Read, Today’s Bonus Targets, Rival Pressure, and a Pressure List with inline dossier expansion.

| Area | Required Direction |
|---|---|
| Visual system | Preserve dark premium challenge look: near-black background, black/dark grey surfaces, gold for rewards/points, red for lives/danger, green for completion/safe state, uppercase labels, no rounded card corners where practical. |
| First screen priority | Add a sticky strip showing Rank, Points, Lives, and Day so users keep their position context while scrolling. Add a Next Best Move card immediately below it. |
| Copy changes | Replace internal labels such as “Live Bank” with clearer wording such as “Banked Today”; rename boosts to “Today’s Bonus Targets”; rename rival section to “Rival Pressure”; rename pressure list header to “Who’s safe, slipping, or under pressure.” |
| Interactions | Room Summary expands/collapses; bonus target cards expand; Chase/Defend and pressure rows open or expand participant dossiers; dossier back copy should say “Back to Overview.” |
| Risk language | Use Holding, Watch, and Red Zone instead of longer or less scannable tags. |
| Must preserve | Existing participant data, boost logic, lives logic, rank/points/day context, navigation, and participant detail interactions. |

These notes are a working implementation translation of the attached PDF. The attached images will not be re-opened per user instruction.
