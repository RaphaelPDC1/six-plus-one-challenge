# Framer Reference Notes — LetterTestimonials

The supplied URL is a Framer module loader for `LetterTestimonials_prod`. It points to a hosted JavaScript module rather than a visual documentation page. I passively inspected the module without executing it.

Key design and interaction cues to translate natively:

| Aspect | Observed Reference Behavior | Native App Translation |
|---|---|---|
| Object metaphor | A physical paper/letter/testimonial panel with front/back flip behavior | Make the journal/reflection input feel like a premium letter card or field report rather than a generic textarea |
| Motion | Uses a flip transition, with default transition noted as tween duration 0.8s and easeOut | Use CSS-driven reveal/flip/slide transitions with smooth easing; avoid importing the Framer component |
| Texture and depth | Paper color, text color, signature color, box shadow, and paper shadow controls are exposed | Add layered borders, inner gold rule lines, subtle paper-grid/scanline texture, and sharp poster shadows compatible with current dark aesthetic |
| Content structure | Greeting, body text, closing, and signature fields | Structure the journal entry as a “field note” with prompt header, large body input, closing/insight cue, and public-share toggle |
| Customization | Supports multiple entries and a current-entry index | Keep existing daily-log state but improve the active reflection card visual and interaction states |
| Constraint | Source is a marketplace-style component | Do not import or run the module in the app; implement an original native React/Tailwind component inspired by the interaction language |

Implementation constraint: keep the existing daily-log field names and submission payload intact so challenge logic, life-loss mechanics, Monzo obligations, WhatsApp persistence, and Warden scaffolding remain stable.
