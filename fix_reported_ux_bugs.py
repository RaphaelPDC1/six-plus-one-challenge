from pathlib import Path

path = Path('/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx')
text = path.read_text()

text = text.replace('import React, { useEffect, useMemo, useRef, useState } from "react";\n', 'import React, { useEffect, useMemo, useRef, useState } from "react";\nimport { createPortal } from "react-dom";\n')

text = text.replace('  const focusedParticipant = participants.find((participant: any) => participant.id === focusedParticipantId) ?? participants[0];', '  const focusedParticipant = participants.find((participant: any) => String(participant.id) === String(focusedParticipantId ?? participants[0]?.id)) ?? participants[0];')

old_graph_header = '''        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone="gold">Group Pulse</MicroLabel>
            <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">Signal first. Graph second.</h2>
          </div>
          <button type="button" onClick={() => { pulse(10); setComparisonOpen(open => !open); }} className="min-h-11 border border-[#C8A96E]/60 bg-[#16130B] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]" aria-expanded={comparisonOpen}>
            {comparisonOpen ? "Hide focused graph" : "Open focused graph"}
          </button>
        </div>'''
new_graph_header = '''        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone="gold">Group Pulse</MicroLabel>
            <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">Simple group signal.</h2>
            <p className="mt-2 max-w-xl text-xs font-bold leading-5 text-[#8D8D8D]">No crowded top-10 chart. Tap View Graph, then choose one person by name for a clean person-vs-group line.</p>
          </div>
          <button type="button" onClick={() => { pulse(10); setComparisonOpen(open => !open); }} className="min-h-11 border border-[#C8A96E]/60 bg-[#16130B] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]" aria-expanded={comparisonOpen} data-testid="view-focused-graph-button">
            {comparisonOpen ? "Hide graph" : "View graph"}
          </button>
        </div>'''
text = text.replace(old_graph_header, new_graph_header)

old_graph_open = '''        {comparisonOpen && (
          <div className="mt-4 border border-[#2A2A2A] bg-black p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <MicroLabel tone="green">Focused comparison</MicroLabel>
                <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.05em] text-white">{focusedParticipant?.displayName ?? "Participant"} vs group average.</h3>
              </div>
              <select value={focusedParticipant?.id ?? ""} onChange={event => setFocusedParticipantId(event.target.value)} className="min-h-11 border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-xs font-black uppercase tracking-[0.12em] text-white">
                {participants.map((participant: any) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
              </select>
            </div>
            <div className="mt-3 h-56 min-w-0 overflow-hidden sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={focusedChartData} margin={{ left: -18, right: 4, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#242424" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
                  <YAxis allowDecimals={false} stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
                  <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #C8A96E", borderRadius: 0, color: "#fff" }} />
                  <Line type="monotone" dataKey="focused" name={focusedParticipant?.displayName ?? "Selected"} stroke={GOLD} strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="groupAverage" name="Group average" stroke={GREEN} strokeWidth={3} strokeDasharray="7 5" dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}'''
new_graph_open = '''        {comparisonOpen && (
          <div className="mt-4 border border-[#2A2A2A] bg-black p-3" data-testid="focused-participant-graph-panel">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <MicroLabel tone="green">Graph</MicroLabel>
                  <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.05em] text-white">{focusedParticipant?.displayName ?? "Participant"} vs group average.</h3>
                  <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#777]">Pick one name. The graph stays readable on phones.</p>
                </div>
                <label className="grid gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]">
                  Select participant
                  <select value={String(focusedParticipant?.id ?? "")} onChange={event => setFocusedParticipantId(event.target.value)} className="min-h-11 min-w-[14rem] border border-[#C8A96E]/45 bg-[#0D0D0D] px-3 text-xs font-black uppercase tracking-[0.12em] text-white" data-testid="graph-participant-select">
                    {participants.map((participant: any) => <option key={participant.id} value={String(participant.id)}>{participant.displayName}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Quick participant graph selector">
                {participantMetrics.slice(0, 18).map((participant: any) => {
                  const active = String(participant.id) === String(focusedParticipant?.id);
                  return <button key={participant.id} type="button" onClick={() => { pulse(8); setFocusedParticipantId(String(participant.id)); }} className={classNames("shrink-0 border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]", active ? "border-[#C8A96E] bg-[#C8A96E] text-black" : "border-[#2A2A2A] bg-[#0D0D0D] text-[#BDBDBD]")} aria-pressed={active}>{participant.displayName}</button>;
                })}
              </div>
            </div>
            <div className="mt-3 h-56 min-w-0 overflow-hidden sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={focusedChartData} margin={{ left: -18, right: 4, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#242424" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
                  <YAxis allowDecimals={false} stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
                  <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #C8A96E", borderRadius: 0, color: "#fff" }} />
                  <Line type="monotone" dataKey="focused" name={focusedParticipant?.displayName ?? "Selected"} stroke={GOLD} strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="groupAverage" name="Group average" stroke={GREEN} strokeWidth={3} strokeDasharray="7 5" dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}'''
text = text.replace(old_graph_open, new_graph_open)

old_sheet_start = '''  return (
    <div className={classNames("sheet-backdrop fixed inset-0 z-50 flex items-end overflow-hidden bg-black/70 sm:items-center sm:p-4", closing && "sheet-backdrop-out")} onClick={onClose}>
      <div className={classNames("sheet-panel motion-sheet-panel flex max-h-[92svh] w-full flex-col overflow-hidden border-t-2 border-[#C8A96E] bg-[#0D0D0D] shadow-2xl sm:max-h-[calc(100svh-2rem)] md:mx-auto md:max-w-xl md:border", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} Board participant details`}>'''
new_sheet_start = '''  const sheet = (
    <div className={classNames("sheet-backdrop fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/78 p-3 sm:p-4", closing && "sheet-backdrop-out")} onClick={onClose} data-testid="participant-profile-overlay">
      <div className={classNames("sheet-panel motion-sheet-panel flex max-h-[min(92svh,46rem)] w-full max-w-xl flex-col overflow-hidden border-2 border-[#C8A96E] bg-[#0D0D0D] shadow-[0_24px_90px_rgba(0,0,0,0.82)]", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} Board participant details`}>'''
text = text.replace(old_sheet_start, new_sheet_start)
old_sheet_end = '''    </div>
  );
}

function ProofMediaStrip'''
new_sheet_end = '''    </div>
  );

  return typeof document === "undefined" ? sheet : createPortal(sheet, document.body);
}

function ProofMediaStrip'''
text = text.replace(old_sheet_end, new_sheet_end)

old_nav = '''      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] md:hidden" aria-label="Mobile primary navigation" data-testid="mobile-floating-nav">
        <div className="pointer-events-auto relative mx-auto flex max-w-[26rem] items-center justify-between overflow-hidden rounded-[1.35rem] border border-[#C8A96E]/35 bg-[#070707]/94 px-1.5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.72)] backdrop-blur-xl">
          <div
            className="motion-tab-indicator absolute top-0 z-0 h-[3px] rounded-full bg-[#C8A96E] shadow-[0_24px_28px_rgba(200,169,110,0.48)] transition-transform duration-300 ease-out"
            style={{ width: `${100 / Math.max(1, mobileTabs.length)}%`, transform: `translateX(${activeMobileIndex * 100}%)` }}
            aria-hidden="true"
          />
          {mobileTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => { pulse(10); setActiveTab(tab.key); }}
                className={classNames(
                  "motion-tab motion-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 py-2 text-[7px] font-black uppercase leading-none tracking-[0.08em] transition-colors duration-200 min-[380px]:text-[8px]",
                  active ? "motion-tab-active bg-[#151108] text-[#C8A96E]" : "text-[#777] hover:text-white"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className={classNames("grid h-7 w-7 place-items-center rounded-full transition", active ? "bg-[#C8A96E] text-black shadow-[0_0_24px_rgba(200,169,110,0.35)]" : "bg-white/[0.03] text-[#777]")}>
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="block max-w-full truncate whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>'''
new_nav = '''      <MobileBottomNav mobileTabs={mobileTabs} activeTab={activeTab} activeMobileIndex={activeMobileIndex} onSelect={setActiveTab} />'''
text = text.replace(old_nav, new_nav)

insert_after_tabs = '''const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "myday", label: "My Day", icon: Lock },
  { key: "overview", label: "Overview", icon: Activity },
  { key: "leaderboard", label: "Board", icon: Trophy },
  { key: "proof", label: "Proof", icon: MessageSquare },
  { key: "rewards", label: "Rewards", icon: Gift },
  { key: "calendar", label: "Journey", icon: Calendar },
  { key: "admin", label: "Founder", icon: Crown },
];
'''
mobile_component = '''const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "myday", label: "My Day", icon: Lock },
  { key: "overview", label: "Overview", icon: Activity },
  { key: "leaderboard", label: "Board", icon: Trophy },
  { key: "proof", label: "Proof", icon: MessageSquare },
  { key: "rewards", label: "Rewards", icon: Gift },
  { key: "calendar", label: "Journey", icon: Calendar },
  { key: "admin", label: "Founder", icon: Crown },
];

function MobileBottomNav({ mobileTabs, activeTab, activeMobileIndex, onSelect }: { mobileTabs: Array<{ key: TabKey; label: string; icon: any }>; activeTab: TabKey; activeMobileIndex: number; onSelect: (tab: TabKey) => void }) {
  const nav = (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] md:hidden" aria-label="Mobile primary navigation" data-testid="mobile-floating-nav" data-fixed-viewport-nav="true">
      <div className="pointer-events-auto relative mx-auto flex max-w-[26rem] items-center justify-between overflow-hidden rounded-[1.35rem] border border-[#C8A96E]/45 bg-[#070707]/96 px-1.5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.78)] backdrop-blur-xl">
        <div
          className="motion-tab-indicator absolute top-0 z-0 h-[3px] rounded-full bg-[#C8A96E] shadow-[0_24px_28px_rgba(200,169,110,0.48)] transition-transform duration-300 ease-out"
          style={{ width: `${100 / Math.max(1, mobileTabs.length)}%`, transform: `translateX(${activeMobileIndex * 100}%)` }}
          aria-hidden="true"
        />
        {mobileTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { pulse(10); onSelect(tab.key); }}
              className={classNames(
                "motion-tab motion-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 py-2 text-[7px] font-black uppercase leading-none tracking-[0.08em] transition-colors duration-200 min-[380px]:text-[8px]",
                active ? "motion-tab-active bg-[#151108] text-[#C8A96E]" : "text-[#777] hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={classNames("grid h-7 w-7 place-items-center rounded-full transition", active ? "bg-[#C8A96E] text-black shadow-[0_0_24px_rgba(200,169,110,0.35)]" : "bg-white/[0.03] text-[#777]")}>
                <Icon className="h-4 w-4 shrink-0" />
              </span>
              <span className="block max-w-full truncate whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
  return typeof document === "undefined" ? nav : createPortal(nav, document.body);
}
'''
text = text.replace(insert_after_tabs, mobile_component)

path.write_text(text)
print('Applied reported UX bug fixes to Home.tsx')
