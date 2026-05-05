import fs from 'node:fs';

const path = '/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx';
const source = fs.readFileSync(path, 'utf8');
const start = source.indexOf('function Landing() {');
const end = source.indexOf('\nfunction RuleCard', start);
if (start === -1 || end === -1) {
  throw new Error('Could not locate Landing component block');
}

const compactLanding = String.raw`function Landing() {
  const moneyCards = [
    ["ENTRY DEPOSIT", "£100", "Everyone puts in £100 before the challenge starts. This is held for the full 50 days."],
    ["COST PER FAIL", "£25", "Every missed workout costs £25 from your deposit. Miss 4 workouts and your £100 is gone."],
    ["IF YOU COMPLETE", "£100", "Finish all 50 days with at least one life remaining and your full £100 comes straight back."],
  ] as const;

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] text-white">
      <section className="container py-5 sm:py-6">
        <nav className="flex flex-col items-start gap-4 border-b border-[#2A2A2A] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <LogoMark />
            <div className="min-w-0">
              <MicroLabel tone="gold">6+1 4 Lives Challenge</MicroLabel>
              <p className="mt-2 max-w-[18rem] text-xs font-black uppercase tracking-[0.18em] text-white sm:max-w-none sm:text-sm sm:tracking-[0.22em]">4 Lives. 50 days. Make it count.</p>
            </div>
          </div>
          <SharpButton className="w-full sm:w-auto" onClick={scrollToEntryPanel}>
            <UserRound className="h-4 w-4" /> Register / Log in
          </SharpButton>
        </nav>

        <div className="grid gap-4 py-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] xl:items-stretch">
          <section className="relative overflow-hidden border border-[#2A2A2A] bg-[#080808]/92 p-5 sm:p-6 lg:p-7">
            <div className="absolute -right-8 -top-10 text-[11rem] font-black leading-none tracking-[-0.14em] text-white/[0.025] sm:text-[14rem]" aria-hidden="true">4</div>
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div>
                <MicroLabel tone="red">6+1 4 LIVES CHALLENGE</MicroLabel>
                <h1 className="mt-4 max-w-3xl text-6xl font-black uppercase leading-[0.78] tracking-[-0.1em] sm:text-8xl lg:text-9xl">
                  4<br />Lives.
                </h1>
                <p className="mt-5 max-w-2xl text-xl font-black leading-8 text-white sm:text-2xl">50 days. Make it count. Remember you're not a civilian.</p>
                <p className="mt-5 max-w-3xl text-sm font-bold leading-6 text-[#BDBDBD] sm:text-base sm:leading-7">6+1. There are 7 days in a week and every single one is an opportunity to be better. Not just for you. For the people next to you. Better everyday. Better together. You have 50 days. Make it count.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {challengeStats.map(([label, value]) => (
                  <div key={label} className="border border-[#2A2A2A] bg-[#111] p-3">
                    <MicroLabel tone="gold">{label}</MicroLabel>
                    <p className="mt-2 text-2xl font-black uppercase text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <SiteEntryPanel />
            <section className="border-l-4 border-[#C0392B] bg-[#130F0F] p-4">
              <MicroLabel tone="red">Your Lives</MicroLabel>
              <p className="mt-2 text-base font-black leading-7 text-white">Miss a workout. Lose a life. Lose 4 lives and you're done.</p>
              <div className="mt-4 grid grid-cols-4 gap-1 bg-[#2A2A2A] p-[2px]" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => <span key={index} className="h-7 bg-[#C0392B]" />)}
              </div>
            </section>
            <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4">
              <div className="flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                <div>
                  <MicroLabel tone="gold">00 · What This Is</MicroLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">Tested together.</h2>
                </div>
                <span className="text-4xl font-black text-[#C8A96E]/35">00</span>
              </div>
              <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-[#CFCFCF]">
                <p>The team only functions like a dream team when we are tested. We need to suffer together. That's what this challenge is about.</p>
                <p>50 days of mashing work. Side by side. The Movers holding each other to the standard we talk about. Not just on runs. Not just at events. Every. Single. Day.</p>
                <p>This challenge isn't for everyone. It's for the ones ready to mash work. The ones who understand that doing hard things is the price you pay to be the best version of yourself. Are you on it?</p>
              </div>
              <div className="mt-4 border border-[#C8A96E]/50 bg-black p-3">
                <MicroLabel tone="gold">Weekly Check In</MicroLabel>
                <p className="mt-2 text-sm font-black leading-6 text-white">Every Sunday morning at 10:00am. Show up. Be honest. Move forward.</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#BDBDBD]">Challenge each other to continue getting better.</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="grid gap-4 pb-8">
          <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
              <div>
                <MicroLabel tone="gold">01 · The Rules</MicroLabel>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Six rules. One source of truth.</h2>
              </div>
              <p className="max-w-xs text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Compact by default. Tap open for the exact brief.</p>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {landingRules.map(([number, icon, title, body, footer]) => (
                <details key={number} className="group border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span>
                      <span className="poster-label text-[#C8A96E]">{number} · {footer}</span>
                      <span className="mt-2 block text-lg font-black uppercase tracking-[-0.04em] text-white">{title}</span>
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#2A2A2A] text-xl" aria-hidden="true">{icon}</span>
                  </summary>
                  <p className="mt-3 border-t border-[#2A2A2A] pt-3 text-sm font-bold leading-6 text-[#BDBDBD]">{body}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
              <div className="flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                <div>
                  <MicroLabel tone="gold">02 · Daily Checklist</MicroLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">What must be true today.</h2>
                </div>
                <span className="text-4xl font-black text-[#C8A96E]/35">02</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {dailyChecklist.map(([title, detail]) => (
                  <div key={title} className="border border-[#2A2A2A] bg-black p-3">
                    <p className="text-sm font-black uppercase tracking-[-0.03em] text-white">{title}</p>
                    <p className="mt-1 text-xs font-bold text-[#BDBDBD]">{detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
              <div className="flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                <div>
                  <MicroLabel tone="red">03 · The Lives System / 04 · The Money</MicroLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">The cost is visible.</h2>
                </div>
                <span className="text-4xl font-black text-[#C0392B]/35">03</span>
              </div>
              <p className="mt-4 text-sm font-bold leading-6 text-[#CFCFCF]">You start with 4 lives. The only way to lose a life is to miss your daily workout. Every life lost costs you £25. Lose all 4 and you're out.</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[["1", "STILL IN IT"], ["2", "STILL IN IT"], ["3", "LAST WARNING"], ["4", "GONE. DONE."]].map(([number, label]) => (
                  <div key={number} className="border border-[#2A2A2A] bg-black p-3">
                    <p className="text-2xl font-black text-[#C0392B]">{number}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {moneyCards.map(([label, amount, body]) => (
                  <div key={label} className="border border-[#2A2A2A] bg-black p-3">
                    <MicroLabel tone="gold">{label}</MicroLabel>
                    <p className="mt-2 text-2xl font-black text-white">{amount}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-[#BDBDBD]">{body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
              <div>
                <MicroLabel tone="gold">05 · The Journey / The Movers</MicroLabel>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">From day one to the finish line.</h2>
              </div>
              <p className="max-w-sm text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Timeline and standards stay on one compact board.</p>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                {journeySteps.map(([day, title, detail]) => (
                  <article key={day} className="border border-[#2A2A2A] bg-black p-3">
                    <MicroLabel tone="gold">{day}</MicroLabel>
                    <h3 className="mt-2 text-sm font-black uppercase tracking-[-0.03em] text-white">{title}</h3>
                    <p className="mt-2 text-xs font-bold leading-5 text-[#BDBDBD]">{detail}</p>
                  </article>
                ))}
              </div>
              <details className="border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70" open>
                <summary className="cursor-pointer list-none">
                  <MicroLabel tone="gold">The Movers · Rules for the Movers</MicroLabel>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#CFCFCF]">These aren't challenge rules. These are the principles and standards we should live by. You're not a civilian.</p>
                </summary>
                <div className="mt-3 grid max-h-80 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                  {moverPrinciples.map((principle, index) => (
                    <div key={principle} className="grid grid-cols-[2.5rem_1fr] border border-[#2A2A2A] bg-[#080808]">
                      <div className="grid place-items-center border-r border-[#2A2A2A] text-xs font-black text-[#C8A96E]">{String(index + 1).padStart(2, "0")}</div>
                      <p className="p-2 text-xs font-bold leading-5 text-white">{principle}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-black uppercase tracking-[-0.03em] text-white">Better everyday. Better together. This is what that looks like in practice.</p>
                <p className="mt-1 text-2xl font-black uppercase text-[#C8A96E]">6+1</p>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white">4 LIVES CHALLENGE</p>
              </details>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
`;

const next = `${source.slice(0, start)}${compactLanding}${source.slice(end)}`;
fs.writeFileSync(path, next);
console.log('Compact landing replacement applied');
