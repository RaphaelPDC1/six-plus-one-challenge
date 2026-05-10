from pathlib import Path

path = Path('/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx')
source = path.read_text()

component = r'''
function ProofV2TopLayer({ publicLogs, snapshot, latestDay, waiting }: { publicLogs: any[]; snapshot: Snapshot; latestDay: number; waiting: any[] }) {
  const participants = snapshot?.participants ?? [];
  const logsWithMedia = publicLogs.filter((log: any) => parseProofMedia(log.exerciseProofUrl).length > 0);
  const featuredLog = logsWithMedia[0] ?? publicLogs[0];
  const featuredOwner = featuredLog ? participants.find((p: any) => p.id === featuredLog.participantId) : null;
  const featuredMedia = featuredLog ? parseProofMedia(featuredLog.exerciseProofUrl) : [];
  const latestTiles = logsWithMedia.slice(0, 6);
  const totalProofItems = logsWithMedia.reduce((total: number, log: any) => total + parseProofMedia(log.exerciseProofUrl).length, 0);
  const totalComments = publicLogs.reduce((total: number, log: any) => total + Number((log.proofComments ?? []).length), 0);
  const totalReactions = publicLogs.reduce((total: number, log: any) => total + Number(log.proofReactions?.total ?? 0), 0);
  const dayProofs = publicLogs.filter((log: any) => Number(log.dayNumber ?? 0) === latestDay).length;

  return (
    <div className="grid gap-4" data-testid="proof-v2-top-layer">
      <div className="relative isolate overflow-hidden border border-[#C8A96E]/45 bg-[radial-gradient(circle_at_top_left,rgba(200,169,110,0.22),transparent_34%),linear-gradient(135deg,#120E07_0%,#070707_56%,#120706_100%)] p-4 shadow-[0_0_42px_rgba(200,169,110,0.12)] sm:p-5" data-testid="proof-v2-command-deck">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#C8A96E]/20 bg-[#C8A96E]/10 blur-2xl" aria-hidden="true" />
        <div className="relative grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="min-w-0">
            <MicroLabel tone="gold">Proof v2</MicroLabel>
            <h2 className="mt-3 max-w-xl break-words text-[2.55rem] font-black uppercase leading-[0.78] tracking-[-0.1em] text-white min-[390px]:text-[3.15rem] sm:text-6xl">Proof wall above. Feed below.</h2>
            <p className="mt-4 max-w-md text-[11px] font-black uppercase leading-5 tracking-[0.14em] text-[#BDB8AC]">A stronger top layer for the best receipts, pressure, and recent movement. The normal Proof feed stays underneath for full comments, reactions, and Deep Thought.</p>
            <div className="mt-5 grid grid-cols-3 gap-2" data-testid="proof-v2-stat-strip">
              <div className="border border-[#2ECC71]/35 bg-[#06140B]/80 p-3"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#6FE29B]">Today</p><p className="mt-1 text-2xl font-black text-white">{dayProofs}</p></div>
              <div className="border border-[#C8A96E]/35 bg-[#120E07]/80 p-3"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#E0B85A]">Receipts</p><p className="mt-1 text-2xl font-black text-white">{totalProofItems}</p></div>
              <div className="border border-[#C0392B]/35 bg-[#180909]/80 p-3"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#F07065]">Talk</p><p className="mt-1 text-2xl font-black text-white">{totalComments + totalReactions}</p></div>
            </div>
          </div>
          <div className="min-w-0 border border-white/10 bg-black/40 p-3" data-testid="proof-v2-featured-receipt">
            <div className="flex items-center justify-between gap-3">
              <MicroLabel tone="green">Featured receipt</MicroLabel>
              <span className="shrink-0 border border-[#2ECC71]/45 bg-[#06140B] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#6FE29B]">Latest</span>
            </div>
            {featuredLog ? (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <ProfilePhoto participant={featuredOwner} className="h-10 w-10 border-[#C8A96E]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-[-0.03em] text-white">{featuredOwner?.displayName ?? "Participant"}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Day {featuredLog.dayNumber} · {featuredMedia.length || 1} item{(featuredMedia.length || 1) === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="mt-3 overflow-hidden border border-[#262626] bg-[#080808]" data-testid="proof-v2-featured-media">
                  {featuredMedia[0] ? <ProofCarousel items={featuredMedia.slice(0, 3)} dayNumber={featuredLog.dayNumber} ownerName={featuredOwner?.displayName} /> : <p className="p-4 text-xs font-bold italic leading-5 text-[#F0D58A]">{String(featuredLog.readTeachText ?? "Proof context submitted.")}</p>}
                </div>
              </div>
            ) : (
              <p className="mt-3 border border-[#2A2A2A] bg-[#080808] p-4 text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#777]">No receipts yet. This feature card fills as soon as proof lands.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_0.72fr]" data-testid="proof-v2-latest-and-pressure">
        <div className="border border-[#202020] bg-[#0B0B0B] p-3">
          <div className="flex items-center justify-between gap-3">
            <MicroLabel tone="green">Latest receipts</MicroLabel>
            <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#666]">Stable grid · newest first</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="proof-v2-latest-grid">
            {latestTiles.map((log: any, index: number) => {
              const owner = participants.find((p: any) => p.id === log.participantId);
              const media = parseProofMedia(log.exerciseProofUrl)[0];
              const src = media ? proofMediaSrc(media) : "";
              const imageSrc = media ? proofImageSrc(media.url) : "";
              return (
                <div key={`${log.id}-latest-${index}`} className="relative min-h-[7.5rem] overflow-hidden border border-[#242424] bg-black" data-testid="proof-v2-latest-tile">
                  {media && proofMediaType(media) === "video" ? <video className="h-full min-h-[7.5rem] w-full object-cover opacity-80" muted autoPlay loop playsInline preload="metadata"><source src={src} type={proofVideoMimeType(media.url, media.mimeType)} /></video> : imageSrc ? <img src={src} alt={`Latest proof from ${owner?.displayName ?? "participant"}`} className="h-full min-h-[7.5rem] w-full object-cover opacity-85" loading="lazy" decoding="async" /> : <div className="grid min-h-[7.5rem] place-items-center p-3 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[#C8A96E]">Teaching logged</div>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">{owner?.displayName ?? "Participant"}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#E0B85A]">Day {log.dayNumber}{index === 0 ? " · New" : ""}</p>
                  </div>
                </div>
              );
            })}
            {latestTiles.length === 0 && <p className="col-span-full border border-[#2A2A2A] bg-[#080808] p-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#666]">No media receipts yet.</p>}
          </div>
        </div>
        <div className="border border-[#3A1815] bg-[#120707] p-3" data-testid="proof-v2-pressure-card">
          <MicroLabel tone="red">Accountability pressure</MicroLabel>
          <p className="mt-3 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Who still owes the room?</p>
          {waiting.length > 0 ? (
            <div className="mt-4 space-y-2">
              {waiting.map((participant: any) => <div key={participant.id} className="flex items-center gap-2 border border-[#3A1815] bg-black/35 p-2"><ProfilePhoto participant={participant} className="h-8 w-8 border-[#4A2A2A]" /><p className="min-w-0 truncate text-xs font-black uppercase text-[#F0D6D1]">{participant.displayName ?? "Participant"}</p></div>)}
            </div>
          ) : (
            <p className="mt-4 border border-[#2ECC71]/35 bg-[#06140B] p-3 text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#6FE29B]">No one is on the visible waiting list for Day {latestDay}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
'''

if 'function ProofV2TopLayer' not in source:
    source = source.replace('function ProofFeed({ snapshot }: { snapshot: Snapshot }) {', component + '\nfunction ProofFeed({ snapshot }: { snapshot: Snapshot }) {')

old = '''  return (
    <section className="mx-auto flex w-full max-w-[38rem] flex-col border border-[#202020] bg-[#070707] p-3 shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:p-5" data-testid="proof-feed-redesign">
      <MicroLabel tone="green">Proof feed</MicroLabel>
      <h2 className="mt-2 break-words text-[2rem] font-black uppercase leading-[0.82] tracking-[-0.08em] text-white sm:text-5xl">Receipts.<br />Insights.<br />Momentum.</h2>
      <p className="mt-3 max-w-sm text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-[#858585]">What the day says once the noise is stripped away.</p>
      {waiting.length > 0 && (
        <div className="mt-5 border border-[#C0392B]/35 bg-[#19090A]/70 p-3" data-testid="proof-waiting-bar">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C0392B]">Waiting on {waiting.length} player{waiting.length === 1 ? "" : "s"} · Day {latestDay}</p>
          <div className="mt-2 flex items-center gap-2">
            {waiting.map((participant: any) => <ProfilePhoto key={participant.id} participant={participant} className="h-8 w-8 border-[#4A2A2A]" />)}
            <span className="text-[10px] font-bold italic text-[#777]">No proof submitted yet today</span>
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-3">'''

new = '''  return (
    <section className="mx-auto flex w-full max-w-[56rem] flex-col gap-4" data-testid="proof-page-v2-with-normal-feed">
      <ProofV2TopLayer publicLogs={publicLogs} snapshot={snapshot} latestDay={latestDay} waiting={waiting} />
      <div className="w-full max-w-[38rem] self-center border border-[#202020] bg-[#070707] p-3 shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:p-5" data-testid="proof-feed-redesign">
        <MicroLabel tone="green">Normal proof feed</MicroLabel>
        <h2 className="mt-2 break-words text-[2rem] font-black uppercase leading-[0.82] tracking-[-0.08em] text-white sm:text-5xl">Receipts.<br />Insights.<br />Momentum.</h2>
        <p className="mt-3 max-w-sm text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-[#858585]">Full proof cards, comments, reactions, and Deep Thought stay here below the v2 layer.</p>
        {waiting.length > 0 && (
          <div className="mt-5 border border-[#C0392B]/35 bg-[#19090A]/70 p-3" data-testid="proof-waiting-bar">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C0392B]">Waiting on {waiting.length} player{waiting.length === 1 ? "" : "s"} · Day {latestDay}</p>
            <div className="mt-2 flex items-center gap-2">
              {waiting.map((participant: any) => <ProfilePhoto key={participant.id} participant={participant} className="h-8 w-8 border-[#4A2A2A]" />)}
              <span className="text-[10px] font-bold italic text-[#777]">No proof submitted yet today</span>
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-3" data-testid="normal-proof-feed-below-v2">'''

if 'data-testid="proof-page-v2-with-normal-feed"' not in source:
    if old not in source:
        raise SystemExit('Expected ProofFeed return block was not found.')
    source = source.replace(old, new)
    source = source.replace('''      </div>
    </section>
  );
}

function LifeDots''', '''        </div>
      </div>
    </section>
  );
}

function LifeDots''')

path.write_text(source)
