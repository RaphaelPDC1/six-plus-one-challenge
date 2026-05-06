from pathlib import Path

root = Path('/home/ubuntu/six-plus-one-challenge')
home = root / 'client/src/pages/Home.tsx'
register = root / 'client/src/pages/Register.tsx'
calendar = root / 'client/src/pages/Calendar.tsx'
css = root / 'client/src/index.css'

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing expected marker for {label}: {old[:140]}')
    return text.replace(old, new, 1)

def replace_all(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count == 0:
        raise SystemExit(f'Missing expected marker for {label}: {old[:140]}')
    return text.replace(old, new)

h = home.read_text()
h = replace_once(h,
    '"poster-button flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs transition disabled:cursor-not-allowed",',
    '"poster-button motion-press flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs transition disabled:cursor-not-allowed",',
    'sharp button motion press')
h = replace_once(h,
    '<section className={classNames("border border-[#2A2A2A] bg-[#101010]", compact ? "p-2" : "p-4")}>',
    '<section className={classNames("motion-card border border-[#2A2A2A] bg-[#101010]", compact ? "p-2" : "p-4")}>',
    'health bar card motion')
h = replace_once(h,
    '<div className="border border-[#2A2A2A] bg-[#111] p-4">',
    '<div className="motion-card border border-[#2A2A2A] bg-[#111] p-4">',
    'poster stat card motion')
h = replace_once(h,
    '<aside className="border-l-4 border-[#C0392B] bg-[#130F0F] p-4">',
    '<aside className="motion-card warden-pulse border-l-4 border-[#C0392B] bg-[#130F0F] p-4">',
    'warden presence motion')
h = replace_once(h,
    '<div className={classNames("relative overflow-hidden border border-[#C8A96E]/40 bg-[#070707]", compact ? "h-16 w-16 shrink-0" : "mb-4 aspect-[4/3] w-full")}>',
    '<div className={classNames("motion-reward-visual relative overflow-hidden border border-[#C8A96E]/40 bg-[#070707]", compact ? "h-16 w-16 shrink-0" : "mb-4 aspect-[4/3] w-full")}>',
    'reward visual motion')
h = replace_once(h,
    'className="mt-8 scroll-mt-10 border border-[#2A2A2A] bg-[#090909]/94 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70 sm:p-5"',
    'className="motion-card motion-reveal mt-8 scroll-mt-10 border border-[#2A2A2A] bg-[#090909]/94 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70 sm:p-5"',
    'entry panel motion')
h = replace_once(h,
    'className="group min-h-32 border border-[#C8A96E]/70 bg-[#C8A96E] p-4 text-left text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(200,169,110,0.20)] focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:ring-offset-2 focus:ring-offset-black"',
    'className="group motion-card motion-press min-h-32 border border-[#C8A96E]/70 bg-[#C8A96E] p-4 text-left text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(200,169,110,0.20)] focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:ring-offset-2 focus:ring-offset-black"',
    'register choice card motion')
h = replace_once(h,
    'className="border border-[#2A2A2A] bg-black p-4"\n          data-testid="login-flow-panel"',
    'className="motion-card border border-[#2A2A2A] bg-black p-4"\n          data-testid="login-flow-panel"',
    'login panel motion')
h = replace_once(h,
    '<main className="poster-grid min-h-screen bg-[#0D0D0D] text-white">',
    '<main className="poster-grid motion-page min-h-screen bg-[#0D0D0D] text-white">',
    'landing page motion')
h = replace_once(h,
    '<section className="relative overflow-hidden border border-[#2A2A2A] bg-[#080808]/92 p-5 sm:p-6 lg:p-7">',
    '<section className="motion-hero relative overflow-hidden border border-[#2A2A2A] bg-[#080808]/92 p-5 sm:p-6 lg:p-7">',
    'landing hero motion')
h = replace_once(h,
    '<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">',
    '<div className="motion-list grid grid-cols-2 gap-2 sm:grid-cols-4">',
    'challenge stats list motion')
h = replace_once(h,
    'className="border border-[#2A2A2A] bg-[#111] p-3"',
    'className="motion-card border border-[#2A2A2A] bg-[#111] p-3"',
    'challenge stat card motion')
h = replace_once(h,
    '<aside className="grid gap-4">',
    '<aside className="motion-list grid gap-4">',
    'landing aside list motion')
h = replace_once(h,
    '<div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">',
    '<div className="motion-list mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">',
    'landing rules list motion')
h = replace_all(h,
    'className="group border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70"',
    'className="group motion-card motion-details border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70"',
    'landing details motion')
h = replace_once(h,
    '<div className="mt-4 grid gap-2 sm:grid-cols-2">\n                {dailyChecklist.map(([title, detail]) => (',
    '<div className="motion-list mt-4 grid gap-2 sm:grid-cols-2">\n                {dailyChecklist.map(([title, detail]) => (',
    'daily checklist list motion')
h = replace_once(h,
    'className="border border-[#2A2A2A] bg-black p-3">\n                    <p className="text-sm font-black uppercase tracking-[-0.03em] text-white">{title}</p>',
    'className="motion-card border border-[#2A2A2A] bg-black p-3">\n                    <p className="text-sm font-black uppercase tracking-[-0.03em] text-white">{title}</p>',
    'daily checklist card motion')
h = replace_once(h,
    '<article key={day} className="border border-[#2A2A2A] bg-black p-3">',
    '<article key={day} className="motion-card border border-[#2A2A2A] bg-black p-3">',
    'journey step card motion')
h = replace_once(h,
    '<article className={classNames("border transition-all duration-300 hover:-translate-y-0.5", complete ? "border-[#2ECC71] bg-[#0F1E15] shadow-[0_0_0_1px_rgba(46,204,113,0.2)]" : active ? "border-[#C0392B] bg-[#1A0D0A] shadow-[0_18px_55px_rgba(192,57,43,0.14)]" : "border-[#7A241B] bg-[#101010]")}> ',
    '<article className={classNames("motion-card rule-card-motion border transition-all duration-300 hover:-translate-y-0.5", complete ? "rule-card-complete border-[#2ECC71] bg-[#0F1E15] shadow-[0_0_0_1px_rgba(46,204,113,0.2)]" : active ? "rule-card-active border-[#C0392B] bg-[#1A0D0A] shadow-[0_18px_55px_rgba(192,57,43,0.14)]" : "border-[#7A241B] bg-[#101010]")}> ',
    'rule card motion state classes')
h = replace_once(h,
    'className={classNames("w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)}',
    'className={classNames("motion-focus w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)}',
    'text input focus motion')
h = replace_once(h,
    'className={classNames("min-h-28 w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)}',
    'className={classNames("motion-focus min-h-28 w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)}',
    'textarea focus motion')
h = replace_once(h,
    'className="journal-letter-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70"',
    'className="journal-letter-card motion-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70"',
    'journal card motion')
h = replace_once(h,
    '<div className="grid gap-5 xl:grid-cols-[1fr_360px]">',
    '<div className="motion-page grid gap-5 xl:grid-cols-[1fr_360px]">',
    'myday motion page')
h = replace_once(h,
    '<div className={classNames("must-do-rules border-2 p-3 transition-all duration-300 sm:p-4",',
    '<div className={classNames("must-do-rules motion-card border-2 p-3 transition-all duration-300 sm:p-4",',
    'must do motion card')
h = replace_once(h,
    '<div className="space-y-2">\n          <RuleCard',
    '<div className="motion-list space-y-2">\n          <RuleCard',
    'rule list motion')
h = replace_once(h,
    '<div className="grid gap-2 bg-[#2A2A2A] p-[2px] sm:grid-cols-3" data-testid="myday-stats-after-must-do">',
    '<div className="motion-list grid gap-2 bg-[#2A2A2A] p-[2px] sm:grid-cols-3" data-testid="myday-stats-after-must-do">',
    'myday stats motion list')
h = replace_once(h,
    '<div className={classNames("submit-dock relative sticky bottom-[106px] z-20 border border-[#2A2A2A] bg-[#0D0D0D]/95 p-3 backdrop-blur transition-all duration-300 md:static md:bg-transparent md:p-0",',
    '<div className={classNames("submit-dock motion-submit-dock relative sticky bottom-[106px] z-20 border border-[#2A2A2A] bg-[#0D0D0D]/95 p-3 backdrop-blur transition-all duration-300 md:static md:bg-transparent md:p-0",',
    'submit dock motion')
h = replace_once(h,
    '<div className={classNames("border p-4 transition", ghostLifeLocked ? "border-[#4A315D] bg-[#120F18] opacity-80" : "border-[#2A2A2A] bg-[#101010]")} data-ghost-life-state={ghostLifeLocked ? "locked" : "available"}>',
    '<div className={classNames("motion-card ghost-life-card border p-4 transition", ghostLifeLocked ? "border-[#4A315D] bg-[#120F18] opacity-80" : "border-[#2A2A2A] bg-[#101010]")} data-ghost-life-state={ghostLifeLocked ? "locked" : "available"}>',
    'ghost life motion')
h = replace_once(h,
    '<article className={classNames("border p-4", tones[tone])}>',
    '<article className={classNames("motion-card border p-4", tones[tone])}>',
    'overview metric motion')
h = replace_once(h,
    '<div className="border border-[#2A2A2A] bg-black p-3">\n      <div className="flex items-center justify-between gap-3">',
    '<div className="motion-card border border-[#2A2A2A] bg-black p-3">\n      <div className="flex items-center justify-between gap-3">',
    'progress mini motion')
h = replace_once(h,
    'className={classNames("h-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}',
    'className={classNames("motion-progress-fill h-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}',
    'progress fill motion')
h = replace_once(h,
    '<div className="space-y-5" data-testid="overview-metrics-dashboard">',
    '<div className="motion-page space-y-5" data-testid="overview-metrics-dashboard">',
    'overview page motion')
h = replace_once(h,
    'className="grid w-full gap-3 border border-[#2A2A2A] bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] focus-visible:border-[#C8A96E] focus-visible:outline-none sm:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_minmax(220px,0.9fr)] sm:items-center"',
    'className="motion-row motion-press grid w-full gap-3 border border-[#2A2A2A] bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] focus-visible:border-[#C8A96E] focus-visible:outline-none sm:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_minmax(220px,0.9fr)] sm:items-center"',
    'overview row motion')
h = replace_once(h,
    '<div className={classNames("sheet-panel max-h-[100svh] w-full overflow-y-auto border-t-2 border-[#C8A96E] bg-[#0D0D0D] p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:p-5 md:mx-auto md:max-w-xl md:border", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} Board participant details`}>',
    '<div className={classNames("sheet-panel motion-sheet-panel max-h-[100svh] w-full overflow-y-auto border-t-2 border-[#C8A96E] bg-[#0D0D0D] p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:p-5 md:mx-auto md:max-w-xl md:border", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} Board participant details`}>',
    'sheet panel motion marker')
h = replace_once(h,
    'className="max-h-[82vh] max-w-full border border-[#C8A96E] bg-black object-contain"',
    'className="motion-image-zoom max-h-[82vh] max-w-full border border-[#C8A96E] bg-black object-contain"',
    'expanded image motion')
h = replace_once(h,
    'className="max-h-80 w-full border border-[#2A2A2A] bg-black object-contain"',
    'className="motion-image-zoom max-h-80 w-full border border-[#2A2A2A] bg-black object-contain"',
    'proof image motion')
h = replace_once(h,
    'className={classNames("grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] sm:grid-cols-[56px_56px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4",',
    'className={classNames("motion-row motion-press grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] sm:grid-cols-[56px_56px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4",',
    'leaderboard row motion')
h = replace_once(h,
    '<article key={log.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-5">',
    '<article key={log.id} className="motion-card border border-[#2A2A2A] bg-[#0D0D0D] p-5">',
    'proof feed card motion')
h = replace_once(h,
    'className={classNames("border bg-[#101010] p-5 text-left transition hover:border-[#C8A96E] disabled:cursor-not-allowed disabled:opacity-60",',
    'className={classNames("motion-card motion-press border bg-[#101010] p-5 text-left transition hover:border-[#C8A96E] disabled:cursor-not-allowed disabled:opacity-60",',
    'reward button motion')
h = replace_once(h,
    '<main className="poster-grid min-h-screen bg-[#0D0D0D] pb-32 text-white md:pb-0">',
    '<main className="poster-grid motion-page min-h-screen bg-[#0D0D0D] pb-32 text-white md:pb-0" data-motion-system="site-wide-v1">',
    'authenticated motion system marker')
h = replace_once(h,
    'className={classNames("flex items-center justify-center gap-2 bg-[#101010] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition", active ? "text-[#C8A96E]" : "text-[#777] hover:text-white")}',
    'className={classNames("motion-tab motion-press flex items-center justify-center gap-2 bg-[#101010] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition", active ? "motion-tab-active text-[#C8A96E]" : "text-[#777] hover:text-white")}',
    'desktop tab motion')
h = replace_once(h,
    'className="absolute top-0 z-0 h-[3px] rounded-full bg-[#C8A96E] shadow-[0_24px_28px_rgba(200,169,110,0.48)] transition-transform duration-300 ease-out"',
    'className="motion-tab-indicator absolute top-0 z-0 h-[3px] rounded-full bg-[#C8A96E] shadow-[0_24px_28px_rgba(200,169,110,0.48)] transition-transform duration-300 ease-out"',
    'mobile tab indicator motion')
h = replace_once(h,
    '"relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 py-2 text-[7px] font-black uppercase leading-none tracking-[0.08em] transition-colors duration-200 min-[380px]:text-[8px]",',
    '"motion-tab motion-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 py-2 text-[7px] font-black uppercase leading-none tracking-[0.08em] transition-colors duration-200 min-[380px]:text-[8px]",',
    'mobile tab button motion')
h = replace_once(h,
    'active ? "bg-[#151108] text-[#C8A96E]" : "text-[#777] hover:text-white"',
    'active ? "motion-tab-active bg-[#151108] text-[#C8A96E]" : "text-[#777] hover:text-white"',
    'mobile tab active marker')
home.write_text(h)

r = register.read_text()
r = r.replace('<main className="poster-grid min-h-screen bg-[#0D0D0D] text-white">', '<main className="poster-grid motion-page min-h-screen bg-[#0D0D0D] text-white">', 1)
r = r.replace('className="mx-auto max-w-3xl border border-[#2A2A2A] bg-[#101010] p-5 shadow-[0_22px_90px_rgba(0,0,0,0.38)]"', 'className="motion-card mx-auto max-w-3xl border border-[#2A2A2A] bg-[#101010] p-5 shadow-[0_22px_90px_rgba(0,0,0,0.38)]"', 1)
r = r.replace('className="grid min-h-40 cursor-pointer place-items-center border border-dashed border-[#C8A96E]/70 bg-black/40 p-4 text-center text-[#C8A96E] transition hover:bg-[#17120A]"', 'className="motion-card motion-press grid min-h-40 cursor-pointer place-items-center border border-dashed border-[#C8A96E]/70 bg-black/40 p-4 text-center text-[#C8A96E] transition hover:bg-[#17120A]"', 1)
r = r.replace('className="mt-6 grid gap-4 md:grid-cols-2"', 'className="motion-list mt-6 grid gap-4 md:grid-cols-2"', 1)
register.write_text(r)

c = calendar.read_text()
c = c.replace('<section className="border border-[#2A2A2A] bg-[#101010] p-5">', '<section className="motion-page border border-[#2A2A2A] bg-[#101010] p-5">', 1)
c = c.replace('className="border border-[#2A2A2A] bg-[#0D0D0D] p-4"', 'className="motion-card border border-[#2A2A2A] bg-[#0D0D0D] p-4"')
c = c.replace('className="border border-[#2A2A2A] bg-black p-3"', 'className="motion-card border border-[#2A2A2A] bg-black p-3"')
calendar.write_text(c)

motion_css = r'''

/* Site-wide motion polish: fast, tactile and reduced-motion safe. */
:root {
  --motion-fast: 160ms;
  --motion-med: 280ms;
  --motion-slow: 520ms;
  --motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-snap: cubic-bezier(0.2, 0.9, 0.18, 1.12);
}

@keyframes motion-page-in {
  from { opacity: 0; transform: translateY(10px); filter: blur(2px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes motion-reveal-up {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes motion-hero-scan {
  0%, 100% { transform: translate3d(-2%, -1%, 0) scale(1); opacity: 0.26; }
  50% { transform: translate3d(2%, 1%, 0) scale(1.04); opacity: 0.44; }
}

@keyframes motion-warden-pulse {
  0%, 100% { box-shadow: inset 4px 0 0 rgba(192,57,43,0.35), 0 0 0 rgba(192,57,43,0); }
  50% { box-shadow: inset 4px 0 0 rgba(192,57,43,0.88), 0 0 28px rgba(192,57,43,0.13); }
}

.motion-page {
  animation: motion-page-in var(--motion-med) var(--motion-ease-out) both;
}

.motion-list > * {
  animation: motion-reveal-up var(--motion-med) var(--motion-ease-out) both;
}

.motion-list > *:nth-child(2) { animation-delay: 35ms; }
.motion-list > *:nth-child(3) { animation-delay: 70ms; }
.motion-list > *:nth-child(4) { animation-delay: 105ms; }
.motion-list > *:nth-child(5) { animation-delay: 140ms; }
.motion-list > *:nth-child(6) { animation-delay: 175ms; }
.motion-list > *:nth-child(n+7) { animation-delay: 210ms; }

.motion-reveal {
  animation: motion-reveal-up var(--motion-slow) var(--motion-ease-out) both;
}

.motion-card,
.motion-row,
.motion-tab,
.motion-focus,
.motion-image-zoom,
.motion-reward-visual {
  transform: translateZ(0);
  will-change: transform, border-color, box-shadow, filter;
}

.motion-card,
.motion-row {
  transition: transform var(--motion-med) var(--motion-ease-out), border-color var(--motion-med) ease, box-shadow var(--motion-med) ease, background-color var(--motion-med) ease, opacity var(--motion-med) ease;
}

.motion-card:hover,
.motion-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 48px rgba(0,0,0,0.24), 0 0 0 1px rgba(200,169,110,0.08);
}

.motion-press {
  transition: transform var(--motion-fast) var(--motion-ease-snap), border-color var(--motion-med) ease, box-shadow var(--motion-med) ease, background-color var(--motion-med) ease, color var(--motion-med) ease;
}

.motion-press:active {
  transform: translateY(1px) scale(0.985);
}

.motion-focus:focus,
.motion-focus:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 0 0 3px rgba(200,169,110,0.13), 0 14px 36px rgba(0,0,0,0.18);
}

.motion-hero::before {
  content: "";
  position: absolute;
  inset: -22%;
  pointer-events: none;
  background: radial-gradient(circle at 18% 22%, rgba(200,169,110,0.22), transparent 30%), linear-gradient(115deg, transparent 36%, rgba(255,255,255,0.045) 48%, transparent 60%);
  animation: motion-hero-scan 7s ease-in-out infinite;
}

.motion-details summary,
.rule-card-motion > button {
  transition: transform var(--motion-fast) var(--motion-ease-out), color var(--motion-med) ease;
}

.motion-details summary:active,
.rule-card-motion > button:active {
  transform: scale(0.992);
}

.rule-card-active {
  transform: translateY(-1px);
}

.rule-card-complete {
  box-shadow: 0 18px 48px rgba(46,204,113,0.08), inset 0 0 0 1px rgba(46,204,113,0.12);
}

.motion-progress-fill {
  transition: width 620ms var(--motion-ease-out), filter var(--motion-med) ease;
}

.motion-submit-dock.submit-dock-ready {
  animation: submit-pulse 1.9s ease-in-out infinite;
}

.motion-submit-dock .poster-button:not(:disabled) {
  transform-origin: center bottom;
}

.warden-pulse {
  animation: motion-warden-pulse 3.6s ease-in-out infinite;
}

.motion-reward-visual::after {
  content: "";
  position: absolute;
  inset: -35% -55%;
  background: linear-gradient(100deg, transparent 38%, rgba(255,255,255,0.12) 50%, transparent 62%);
  transform: translateX(-65%) rotate(8deg);
  transition: transform 760ms var(--motion-ease-out);
}

.motion-card:hover .motion-reward-visual::after,
.motion-reward-visual:hover::after {
  transform: translateX(62%) rotate(8deg);
}

.motion-tab {
  transform-origin: center;
}

.motion-tab-active {
  filter: drop-shadow(0 0 14px rgba(200,169,110,0.22));
}

.motion-tab-indicator {
  will-change: transform;
  transition-duration: 360ms;
  transition-timing-function: var(--motion-ease-out);
}

.motion-sheet-panel {
  transform-origin: center bottom;
}

.motion-image-zoom {
  transition: transform var(--motion-med) var(--motion-ease-out), border-color var(--motion-med) ease, box-shadow var(--motion-med) ease;
}

.motion-image-zoom:hover {
  transform: scale(1.01);
  border-color: rgba(200,169,110,0.85);
  box-shadow: 0 18px 50px rgba(0,0,0,0.35);
}

html.haptic-visual-feedback .motion-press,
html.haptic-visual-feedback .motion-card {
  filter: brightness(1.04);
}

@media (prefers-reduced-motion: reduce) {
  .motion-page,
  .motion-list > *,
  .motion-reveal,
  .motion-hero::before,
  .warden-pulse,
  .motion-submit-dock.submit-dock-ready {
    animation: none !important;
  }

  .motion-card,
  .motion-row,
  .motion-tab,
  .motion-focus,
  .motion-image-zoom,
  .motion-reward-visual,
  .motion-press,
  .motion-progress-fill,
  .motion-tab-indicator,
  .motion-details summary,
  .rule-card-motion > button {
    transition-duration: 1ms !important;
    transform: none !important;
    filter: none !important;
  }

  .motion-reward-visual::after {
    display: none;
  }
}
'''
existing_css = css.read_text()
if 'Site-wide motion polish' not in existing_css:
    css.write_text(existing_css.rstrip() + motion_css + '\n')
else:
    raise SystemExit('Motion polish CSS already present; refusing to append duplicate block')

print('Motion polish applied to Home, Register, Calendar and global CSS.')
