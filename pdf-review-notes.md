# Six Plus One Redesign PDF Review Notes

Source: `/home/ubuntu/upload/sixplusone-redesign.pdf`

Initial visual inspection covered pages 1–5 of a 24-page PDF. The visible content is not a polished slide deck; it appears to be a code-focused export or printed React component source for a proposed 6+1 redesign. The first pages show JavaScript/React code defining a dark visual system, mock participant data, overview stats, life display logic, risk badges, delta badges, and podium card rendering.

Visible design/reference details from pages 1–5 include a near-black palette with colors such as `#0A0A0A`, `#111111`, `#161616`, gold accents around `#C9A84C`, red danger colors, green completion colors, amber, white, muted grey, and gold borders. The code includes mock players such as G Lodge, Chernice, Billie Bob, Kwabs, Senyo, Wiwi, CTM, Nat, Chess, and Nay. It references ten total participants, current day 2 of 50, proof submitted count, active today count, average points, and top streaks.

The PDF includes component ideas relevant to the current app: a `LivesDisplay` using small circular life indicators, `RiskBadge` labels such as LOW/MED/HIGH/CRIT, a `DeltaBadge` showing points behind another participant, and a `PodiumCard` that visually distinguishes first, second, and third place with gold/grey/bronze treatments, scaling, rank badges, avatars/initials, participant names, points, lives, risk, and boost labels.

Key conclusion so far: yes, the PDF is readable, but it appears to be source-code reference material rather than final screenshots. It can still be useful as a design/spec reference for leaderboard, risk, lives, colors, typography, and podium mechanics.

## Pages 6–10

Pages 6–10 continue the React-style source export. They finish the `PodiumCard` details and introduce a `LeaderboardRow` component. The leaderboard row includes conditional styling for the current user, high-risk or critical users, and attention states. The current user is marked with a small `YOU` marker. Rows display rank, participant name, lives, points, pass pace, velocity, proof percentage, risk badge, and gap to the person above.

The Board page copy is visible as `BOARD / BOSSES`, with a headline reading `PODIUM. BOOSTS. PRESSURE.` and supporting text: `RANK RESPECTS POINTS. MOVEMENT TELLS THE REAL STORY.` The podium layout still calls the cards in the order second, first, third for presentation, which is useful as a design reference but should be reconciled with the existing app requirement that mobile DOM order places first before second and third. The section after the podium begins a `Boosted Right Now` compact callout strip.

Design implications from these pages include a stronger competitive board where rank is supported by behavioural signals: pace, velocity, proof completion, lives, boost reason, risk level, and points gap. The visual language is condensed, uppercase, and intentionally high-pressure, using Barlow Condensed, gold highlights, red risk states, and animated or pulsing borders for urgent rows.

## Pages 11–15

Pages 11–15 complete the `Boosted Right Now` callout strip and the full ranking list. The boosted strip shows each boosted participant with name, boost amount, and boost reason. The full ranking section is labelled `FULL RANKING — DAY 2 OF 50` and maps every mock player through `LeaderboardRow`, passing the current user state and the participant above for comparison.

These pages then introduce the `OverviewPage` area. A `StatCard` component supports large numeric values, compact uppercase labels, optional subtext, alert styling, top border accents, and red alert gradients. An `OverviewCompareCard` component shows rank, participant name, a current-user marker, lives, risk badge, a small progress bar for pass pace, and points.

The overview logic calculates whether the group is on pace and whether active participants are below total participants. It also identifies who the current user is chasing and who is chasing the current user. The visible page heading changes to `OVERVIEW / INTELLIGENCE`, which implies a stronger insight/dashboard framing rather than a simple summary screen. The design continues the same compact mobile-first, high-contrast, uppercase visual style.

## Pages 16–20

Pages 16–20 show the later `OverviewPage` layout and the start of bottom navigation. The overview header copy reads `SCORE. RISK. MOMENTUM.` with supporting text `HOW YOU AND THE GROUP ARE ACTUALLY DOING.` A prominent alarm-style stat block displays the number on pace to pass, with conditional green or red styling. The supporting copy warns when most of the group is falling behind, otherwise it indicates the majority are tracking.

The stats grid includes `ACTIVE TODAY`, `PROOF IN`, and `AVG POINTS` cards. These cards use conditional green/amber/red status colours depending on participation, proof counts, and pace. A personalized rivalry section labelled `YOUR RIVALRY` shows two cards: `YOU'RE CHASING` with the points gap to the participant above, and `CHASING YOU` with how many points ahead the user is from the participant below. This could translate into a useful mobile-first motivation block in the existing Overview page.

The group comparison section is labelled `COMPARE WHAT MATTERS` and maps every participant through `OverviewCompareCard`. The PDF then introduces `NAV_ITEMS` for the fixed bottom nav: My Day, Overview, Board, Proof, Rewards, and Journey. The bottom nav is fixed to the bottom of the viewport, centered, max-width 430px, with a near-black background and top border. This broadly matches the current app’s single-page multi-tab mobile-first structure.

## Pages 21–24

Pages 21–24 finish the bottom navigation and then define placeholder pages. The bottom nav active state uses a gold top border, gold icon/text, compact vertical button layout, and a short transition. Placeholder pages display the selected section title and `PAGE DESIGN IN PROGRESS`, meaning only the Board and Overview pages are substantially designed in this PDF while My Day, Proof, Rewards, and Journey are only represented as stubs.

The final section defines a `TopBar` component and app root. The top bar shows a gold-to-white `6+1` wordmark, a small `FOUR LIVES CHALLENGE` subtitle, and a bordered `LOGOUT` button. The app root imports Barlow Condensed from Google Fonts, sets a dark body background, hides the scrollbar, defines simple `pulse` and `borderPulse` keyframes, constrains the layout to max-width 430px, sets the default active page to `board`, renders `TopBar`, conditionally renders Board or Overview pages, uses placeholder pages for My Day, Proof, Rewards, and Journey, and mounts the fixed bottom nav.

Final conclusion after all 24 pages: the PDF is readable and useful, but it is a prototype/source-code reference rather than a complete visual spec for every page. Its strongest actionable material is for the Board/Bosses and Overview/Intelligence redesigns, with reusable components for lives, risk, leaderboard rows, podium cards, comparison cards, top bar, and bottom navigation. It does not provide completed redesign details for My Day, Proof, Rewards, or Journey beyond placeholder stubs.
