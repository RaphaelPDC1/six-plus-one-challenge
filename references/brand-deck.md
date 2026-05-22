# 6+1 Four Lives — Brand Deck v1.0 (May 2026)

> Dark only · System font · No compromises

---

## 01 COLOUR SYSTEM

### Palette

| Token | Hex | Use |
|---|---|---|
| BLACK | #0D0D0D | App background. Never replaced. |
| SURFACE 1 | #111111 | Primary card background. |
| SURFACE 2 | #161616 | Expanded states, secondary cards. |
| BORDER | #1E1E1E | All card borders. Grid gaps. |
| BORDER 2 | #2A2A2A | Heavier dividers, separators. |
| WHITE | #F5F0E8 | Primary text. Never pure white. |
| DIM | #999999 | Secondary text, timestamps. |
| MUTED | #555555 | Labels, section headers, tertiary. |
| GOLD | #C8A96E | Points, rewards, active nav, CTA buttons, headings. |
| GOLD DIM | #3D2E11 | Gold tinted backgrounds, borders. |
| RED | #C0392B | Lives, danger, Warden, life loss, Red Zone. |
| RED DIM | #1A0A08 | Red tinted card backgrounds. |
| GREEN | #27AE60 | Completion, safe status, all-green day, success. |
| GREEN DIM | #0A1F10 | Green tinted card backgrounds. |
| PURPLE | #7C3AED | Ghost Life only. No other use. |
| BLUE | #3B82F6 | Participant accent colour (assigned). Info states. |

### Semantic Colour Rules
- **Gold** = rewards, points, positive achievement, active state
- **Red** = lives, danger, Warden, penalties, Red Zone risk
- **Green** = completion, safe, all done, positive confirmation
- **Purple** = Ghost Life mechanic only — no other context
- **Never** use colour decoratively. Every colour use must carry meaning.

---

## 02 TYPE SCALE

### Font Stack
`-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`
System font only. No Google Fonts. No external dependencies.

### Scales

| Role | Size | Weight | Tracking | Transform | Colour |
|---|---|---|---|---|---|
| DISPLAY / HERO | clamp(40px, 8vw, 80px) | 900 | -3px to -2px | uppercase | white or gold |
| SECTION TITLE | clamp(24px, 4vw, 40px) | 900 | -1.5px | uppercase | white |
| CARD TITLE | 14–16px | 700 | -0.5px | uppercase | white |
| BODY TEXT | 13–14px | 400 | normal | none | #999 |
| SECTION LABEL | 9px | 700 | 3–4px | uppercase | #555 or accent |
| MICRO LABEL | 8–9px | 700 | 2–3px | uppercase | muted or accent |
| STAT NUMBER | 32–56px | 900 | -2px | none | gold / red / green |
| MONOSPACE / CODE | 10–12px | — | — | — | gold or dim |

---

## 03 SPACING SCALE

Base unit: **4px**. All spacing is a multiple of 4. No arbitrary values.

| Value | Use |
|---|---|
| 2px | Grid gaps between cells |
| 4px | Life dot gaps, micro spacing |
| 8px | Label to content, tag internal padding |
| 12px | Card internal top/bottom padding (compact) |
| 16px | Standard card padding, row padding |
| 16px | Page horizontal padding (mobile) |
| 20px | Section internal padding, large cards |
| 24px | Between sections on mobile |
| 32px | Major section gaps, page top padding |
| 48px | Desktop section gaps only |

---

## 04 COMPONENT TOKENS

### Border Radius
- Cards: 0px (none)
- Buttons: 0px (none)
- Tags: 0px (none)
- Life dots: 50% (circle)
- Progress bars: 0–2px
- Avatars: 0px (square)

### Card Border
- Standard: 1px solid #1e1e1e
- Active: 1px solid [accent]33
- Left accent: 3px solid [colour]
- Top accent: 3px solid [colour]
- Grid gap trick: 2px, parent = #1e1e1e

### Buttons
- Primary: bg gold, text black
- Danger: bg red, text white
- Ghost: border gold, bg none
- Disabled: bg #1a1a1a, text #555
- Height: 44–48px
- Font: 10–11px, 900, uppercase, ls 3px

### Tags / Badges
- Height: auto (4px/8px padding)
- Font: 8–9px, 700, uppercase, ls 2px
- Border: 1px solid [colour]33
- Background: [colour]15
- No border radius

### Health Bar
- Segments: 4
- Gap: 3–4px between segs
- Active: #C0392B + glow
- Inactive: #1a1a1a
- Height: 6px (list) / 10px (card) / 14px (hero)
- Radius: 0px

### Life Dots
- Size: 6px (list) / 8px (card) / 10px (hero)
- Shape: circle (50%)
- Active: #C0392B
- Active glow: 0 0 [4–8]px #C0392B
- Inactive: #222222
- Gap: 3px

### Avatars
- Shape: square (0px radius)
- Size: 18px (micro) / 26px (list) / 32px (card) / 40px (hero)
- Background: [participant colour]22
- Border: 1px solid [colour]44
- Text: initials, 28% of size, 700

### Left Border Cards
- Width: 3px left border
- Gold: rewards, Next Best Move
- Red: Warden, danger, life loss
- Green: completion, success
- Purple: Ghost Life only
- Background tinted to match

### Inputs
- Background: #161616
- Border: 1px solid #1e1e1e
- Border-bottom active: 1px solid gold
- No border radius
- Padding: 10–12px
- Font: 13px, system, white

### Shadows / Glows
- Life dot glow: 0 0 6px #C0392B
- Gold glow: 0 0 12px #C8A96E44
- Warden glow: 0 0 20px #C0392B22
- No box-shadow on cards
- No drop shadows
- Glow only on light-emitting elements

### Navigation
- Height: ~52px
- Background: #0D0D0D
- Top border: 1px solid #1e1e1e
- Active: 2px top border gold + gold label
- Inactive: #555 label
- Icon: 16–18px emoji
- Label: 8px, 700, uppercase, ls 3px

### Sticky Strip
- Position: fixed top
- Background: #0D0D0D
- Bottom border: 1px solid #1e1e1e
- Height: ~44px
- Z-index: 10
- Always visible on scroll

---

## 05 ICON SYSTEM

Emoji icons throughout. No icon font, no SVG library. Size scales with context — never decorative without purpose.

### Rules
🚫 No Alcohol · 🥗 Clean Eating · 🏋️ Exercise · 📖 Reflection · 📚 Read & Teach · 📊 Track Log

### System
👁️ Warden · 💀 Ghost Life · 🏆 Leaderboard · 📸 Proof/Media · ✏️ Daily Log · 🎁 Rewards · 🏅 Journey · ⚙️ Settings

### Boosts
✅ Clean Sweep · 🔥 Early Bird · 🔥 Consistency · 🛡️ Deep Defender · 📡 Loud Push · ⚔️ Dark Slayer · 🛡️ Iron Week

### Status
✅ Complete · ⚠️ Warning · ✗ Failed · 🔒 Locked · 📍 Position · 💰 Earned

---

## 06 MOTION RULES

**Motion Principle:** Every number animates. Every checkbox springs. Every life loss shakes. Motion communicates meaning — it is never decorative. Transitions are fast and purposeful.

| Motion | Spec |
|---|---|
| Default transition | 0.2s ease |
| Card expand | 0.3s ease |
| Checkbox spring | spring(stiffness:300, damping:20) |
| Life loss shake | 0.4s, 3 cycles |
| Number ticker | spring(stiffness:200, damping:25) |
| Leaderboard reorder | layout + 0.4s spring |
| List item entry | 0.3s ease, 0.1s stagger |
| Dynamic Island | 0.4s spring |
| Warden pulse | 2s ease-in-out infinite |
| Life dot pulse | 2s ease-in-out infinite |
| Health bar deplete | 0.4s ease |
| Tab transition | 0.2s ease |

---

## 07 UI PATTERNS

### Primary Button
- Active: gold background, black text, uppercase
- Locked: grey (#1a1a1a) background, #555 text

### Tags / Badges
- HOLDING (gold), WARDEN (red), RED ZONE (red), OPEN (green), CLAIMED (green), GHOST LIFE (purple)

### Health Bar States
- 4 lives: 4 equal red segments
- 1 life — critical: 1 red segment, glow

### Left Border Cards
- YOUR NEXT MOVE: gold left border
- WARDEN READ: red left border
- DAY COMPLETE: green left border

### Grid — 2px Gap Trick
- Parent background = border colour (#1e1e1e)
- Children have card background (#111111)
- Creates seamless grid without explicit borders

---

## 08 DO & DON'T

### DO
- Use 0px border radius on all cards and buttons
- Use uppercase for all labels, headings, buttons
- Use 2px grid gap with parent as border colour
- Use 3px left border for all callout cards
- Use semantic colour — gold=reward, red=danger, green=done
- Animate every number that changes
- Keep section labels at 9px, 700 weight, 3–4px tracking
- Use #F5F0E8 for white — never pure #FFFFFF
- Keep body text at #999 — never full white
- Use emoji for all icons — no icon libraries

### DON'T
- Use rounded corners on any card, button, or avatar
- Use colour decoratively — every colour must mean something
- Use purple outside of Ghost Life context
- Use Google Fonts or external font libraries
- Use white backgrounds anywhere
- Use box shadows on cards — glows on light elements only
- Display static numbers that change — always animate them
- Use exclamation marks in copy
- Use "great", "amazing", "well done" in any UI copy
- Use a light mode — dark only, always

---

## 09 COPY RULES

- **Short sentences win** — if it can be said in 5 words, say it in 5 words
- **No filler words** — remove: really, truly, actually, great, amazing. If the sentence works without it, cut it.
- **No exclamation marks** — ever. Copy relies on specificity and directness — not punctuation.
- **Uppercase labels, sentence case body** — section labels, nav buttons: uppercase. Body text, descriptions, Warden messages: sentence case.
- **The Pivot** — state a fact. Immediately reframe. "Exercise is a privilege. Make sure you get it in." / "Miss a rule. Lose a life."
- **Specific over generic** — name the participant. Name the number. Name the day. Generic copy is worse than silence.
- **Action-led microcopy** — "Tap to submit" not "Click here". "Banked today" not "Log submitted". "Who's holding?" not "Please wait."

---

## 10 THE WARDEN VOICE

The Warden is not a notification system. It is a presence. Every string it generates — whether in the WhatsApp group, in the app, or on a screen — must sound like it came from the same entity.

**The Warden in one sentence:** An observant, analytical, direct commentator who frames the challenge as an ongoing story — and who only speaks when something is worth saying.

### Tone Characteristics
- **DIRECT** — No preamble, no hedging. Says the thing. Pivots and moves on.
- **DRY** — Deadpan delivery. Timing matters. Flat delivery from unexpected content.
- **SPECIFIC** — Names the participant. Names the number. Always. Generic is banned.
- **CONCISE** — Maximum two sentences per message. One is better. Never a paragraph.
- **IMPARTIAL** — Doesn't take sides. Doesn't praise or blame. Reports the facts.
- **NARRATIVE** — Frames the challenge as a story. The players are protagonists. The Warden is the film.

### Warden Message Examples

| CORRECT | WRONG |
|---|---|
| "Day 12. Marcus hasn't logged since Tuesday. Three days of silence. That's not a rest day. That's a decision." | "Some participants have not logged recently. Remember to stay consistent and keep up the great work everyone." |
| "Jay and Dami both wrote about resistance today. Different words. Same battle. Interesting." | "Amazing inspiration today! The group is really connecting and growing together. Keep it up!" |
| "Kwabs. One life left. Logged at 23:47. The Warden noticed." | "Great effort from Kwabs today! It's so inspiring to see such dedication. You go girl." |

### Words the Warden NEVER Uses
Amazing, Great, Fantastic, Well done, Keep it up, You've got this, Inspiring, So proud, Love this, Incredible, Excited, Really, Just, Literally, Honestly, Basically, At the end of the day, Touch base, Circle back, Synergy

---

## 11 APP COPY VOICE

Every label, button, empty state, error message, and tooltip in the app has a voice. It is the same voice as the challenge itself — direct, earned, no filler.

### Context → Wrong → Right

| Context | WRONG | RIGHT |
|---|---|---|
| Submit button (active) | "Click here to submit your log!" | "Submit Day 12" |
| Submit button (locked) | "Please complete all tasks first" | "Complete all rules to unlock" |
| Empty proof feed | "No submissions yet. Be the first to share!" | "Nothing logged yet. Be the first." |
| Life lost toast | "Oops! You lost a life. Keep going!" | "Life lost. £25 due. Don't let it happen again." |
| Day complete | "Amazing! You completed today! Great work!" | "Day done. +10 points banked." |
| Streak broken | "Oh no, your streak was broken. Try again!" | "Streak reset. Start again from today." |
| Ghost Life available | "You have a special opportunity to recover!" | "Ghost Life available. Use it once. Use it wisely." |
| Boost claimed | "Congratulations! You won a boost! You're amazing!" | "Clean Sweep. +5 pts. Yours." |
| Loading state | "Loading your amazing dashboard..." | "Loading" |
| Error state | "Something went wrong. Please try again!" | "Failed. Try again." |

### The 6+1 Copy Signature Moves

**THE PIVOT** — State a fact. Immediately reframe.
"Exercise is a privilege. Make sure you get it in." / "Miss a rule. Lose a life."

**THE STANDALONE** — A log's short sentence on one line. No set-up. Context-free.
"Make it count." / "The Warden noticed." / "That's a decision."

**THE QUIET CHALLENGE** — Not a demand, but a dare. The reader knows what it means.
"Not everyone can. You can. Act like it." / "Are you on it?"

**THE COLLECTIVE** — Addresses the group. The group is the entity.
"Better everyday. Better together." / "We need to suffer together."
