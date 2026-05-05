import fs from 'node:fs';
import path from 'node:path';

const root = '/home/ubuntu/six-plus-one-challenge';
const homePath = path.join(root, 'client/src/pages/Home.tsx');
const registerPath = path.join(root, 'client/src/pages/Register.tsx');
const routersPath = path.join(root, 'server/routers.ts');
const indexPath = path.join(root, 'client/index.html');
const manifestPath = path.join(root, 'client/public/site.webmanifest');

function replaceOnce(file, source, find, replace) {
  if (!source.includes(find)) throw new Error(`${file}: missing target: ${find.slice(0, 120)}`);
  return source.replace(find, replace);
}

let home = fs.readFileSync(homePath, 'utf8');
home = replaceOnce('Home.tsx', home, 'import React from "react";', 'import React, { useEffect, useMemo, useRef, useState } from "react";');
home = replaceOnce('Home.tsx', home, `const emptyDay: MyDayForm = {
  noAlcohol: true,
  cleanEating: true,
  cleanEatingNote: "",
  exerciseDuration: 30,
  exerciseType: "",
  exerciseProofUrl: "",
  reflectionText: "",
  reflectionShared: true,
  readTeachText: "",
  trackedEverything: true,
};`, `const emptyDay: MyDayForm = {
  noAlcohol: false,
  cleanEating: false,
  cleanEatingNote: "",
  exerciseDuration: 0,
  exerciseType: "",
  exerciseProofUrl: "",
  reflectionText: "",
  reflectionShared: false,
  readTeachText: "",
  trackedEverything: false,
};`);

home = replaceOnce('Home.tsx', home, `function JournalReflectionCard({
  value,
  shared,
  onChange,
  onShareChange,
}: {
  value: string;
  shared: boolean;
  onChange: (value: string) => void;
  onShareChange: (shared: boolean) => void;
}) {
  const characterCount = value.trim().length;
  return (
    <div className="journal-letter-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70">
      <div className="journal-letter-mark" aria-hidden="true">“</div>
      <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_170px]">
        <label className="block">
          <MicroLabel tone="gold">Reflection</MicroLabel>
          <textarea
            value={value}
            onFocus={() => haptics.tap()}
            onChange={event => onChange(event.target.value)}
            placeholder="One honest line for the group."
            className="journal-letter-input mt-3 min-h-44 w-full resize-none border border-[#1F1F1F] bg-black/50 px-5 py-5 text-base font-extrabold leading-8 text-white outline-none transition duration-300 placeholder:text-[#4E4E4E] focus:border-[#C8A96E] focus:bg-black/80"
          />
        </label>
        <aside className="flex flex-col justify-between border border-[#1F1F1F] bg-[#0D0D0D]/90 p-4">
          <div>
            <MicroLabel tone={characterCount > 0 ? "green" : "muted"}>Signal</MicroLabel>
            <p className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white">{characterCount || "—"}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#777]">chars</p>
          </div>
          <label className="mt-6 flex items-center justify-between gap-3 border-t border-[#242424] pt-4">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#BDBDBD]">Public</span>
            <input type="checkbox" checked={shared} onChange={event => { haptics.tap(); onShareChange(event.target.checked); }} className="h-5 w-5 accent-[#C8A96E]" />
          </label>
        </aside>
      </div>
    </div>
  );
}`, `function JournalReflectionCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const characterCount = value.trim().length;
  return (
    <div className="journal-letter-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70">
      <div className="journal-letter-mark" aria-hidden="true">“</div>
      <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_170px]">
        <label className="block min-w-0">
          <MicroLabel tone="gold">Reflection</MicroLabel>
          <textarea
            value={value}
            onFocus={() => haptics.tap()}
            onChange={event => onChange(event.target.value)}
            placeholder="One honest private line for the log."
            className="journal-letter-input mt-3 min-h-44 w-full resize-none border border-[#1F1F1F] bg-black/50 px-5 py-5 text-base font-extrabold leading-8 text-white outline-none transition duration-300 placeholder:text-[#4E4E4E] focus:border-[#C8A96E] focus:bg-black/80"
          />
        </label>
        <aside className="flex flex-col justify-between border border-[#1F1F1F] bg-[#0D0D0D]/90 p-4">
          <div>
            <MicroLabel tone={characterCount > 0 ? "green" : "muted"}>Private log</MicroLabel>
            <p className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white">{characterCount || "—"}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#777]">chars</p>
          </div>
          <p className="mt-6 border-t border-[#242424] pt-4 text-[10px] font-black uppercase leading-5 tracking-[0.18em] text-[#BDBDBD]">No public reflection option. Saved privately to your challenge log.</p>
        </aside>
      </div>
    </div>
  );
}`);

home = replaceOnce('Home.tsx', home, `  const [form, setForm] = useState<MyDayForm>(emptyDay);
  const [openRule, setOpenRule] = useState<RuleKey>("exercise");
  const [lastMissed, setLastMissed] = useState<string[]>([]);`, `  const [form, setForm] = useState<MyDayForm>(emptyDay);
  const [openRule, setOpenRule] = useState<RuleKey>("exercise");
  const [lastMissed, setLastMissed] = useState<string[]>([]);
  const cameraProofInputRef = useRef<HTMLInputElement | null>(null);
  const libraryProofInputRef = useRef<HTMLInputElement | null>(null);`);

home = replaceOnce('Home.tsx', home, `  const ghost = trpc.challenge.applyGhostLife.useMutation({
    onSuccess: () => {
      pulse([16, 35, 16]);
      toast("Ghost Life check complete.");
      refetch();
    },
    onError: error => toast.error(error.message),
  });`, `  const ghost = trpc.challenge.applyGhostLife.useMutation({
    onSuccess: () => {
      pulse([16, 35, 16]);
      toast("Ghost Life check complete.");
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const uploadProof = trpc.challenge.uploadProof.useMutation({
    onSuccess: data => {
      setForm(current => ({ ...current, exerciseProofUrl: data.url }));
      pulse([12, 28, 12]);
      toast("Proof image uploaded and attached to today’s exercise log.");
    },
    onError: error => toast.error(error.message || "Could not upload proof image."),
  });

  function handleProofFile(file?: File) {
    if (!file) return;
    if (!file.type.match(/^image\\/(png|jpeg|webp)$/)) { toast.error("Use a PNG, JPG, or WEBP proof image."); return; }
    if (file.size > 4_000_000) { toast.error("Proof image must be under 4MB."); return; }
    const reader = new FileReader();
    reader.onload = () => uploadProof.mutate({ fileName: file.name || "exercise-proof", mimeType: file.type, dataUrl: String(reader.result) });
    reader.onerror = () => toast.error("Could not read that proof image.");
    reader.readAsDataURL(file);
  }`);

home = replaceOnce('Home.tsx', home, `<div className="sm:col-span-2">
                <Field label="Proof upload / link"><TextInput value={form.exerciseProofUrl} onChange={event => setForm({ ...form, exerciseProofUrl: event.target.value })} placeholder="Camera, library, Strava or proof note" /></Field>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className="border border-[#C8A96E]/50 bg-[#16130B] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E]" onClick={() => pulse(12)}>Camera</button>
                  <button type="button" className="border border-[#2A2A2A] bg-[#111] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white" onClick={() => pulse(12)}>Library</button>
                </div>
              </div>`, `<div className="sm:col-span-2">
                <Field label="Proof image / link"><TextInput value={form.exerciseProofUrl} onChange={event => setForm({ ...form, exerciseProofUrl: event.target.value })} placeholder="Upload a gym proof image, paste Strava, or add a proof note" /></Field>
                <input ref={cameraProofInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="sr-only" onChange={event => { handleProofFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <input ref={libraryProofInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => { handleProofFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={uploadProof.isPending} className="border border-[#C8A96E]/50 bg-[#16130B] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E] disabled:opacity-50" onClick={() => { pulse(12); cameraProofInputRef.current?.click(); }}>{uploadProof.isPending ? "Uploading" : "Camera"}</button>
                  <button type="button" disabled={uploadProof.isPending} className="border border-[#2A2A2A] bg-[#111] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-50" onClick={() => { pulse(12); libraryProofInputRef.current?.click(); }}>{uploadProof.isPending ? "Uploading" : "Library"}</button>
                </div>
                {form.exerciseProofUrl.startsWith("/manus-storage/") && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">Image attached</p>}
              </div>`);

home = replaceOnce('Home.tsx', home, `<JournalReflectionCard
              value={form.reflectionText}
              shared={form.reflectionShared}
              onChange={reflectionText => setForm({ ...form, reflectionText })}
              onShareChange={reflectionShared => setForm({ ...form, reflectionShared })}
            />`, `<JournalReflectionCard
              value={form.reflectionText}
              onChange={reflectionText => setForm({ ...form, reflectionText, reflectionShared: false })}
            />`);

home = replaceOnce('Home.tsx', home, `onClick={() => submit.mutate({ ...form, dayNumber: snapshot?.challenge.currentDay ?? 1 })}`, `onClick={() => submit.mutate({ ...form, reflectionShared: false, dayNumber: snapshot?.challenge.currentDay ?? 1 })}`);

home = replaceOnce('Home.tsx', home, `function Overview({ snapshot }: { snapshot: Snapshot }) {
  const participants = snapshot?.participants ?? [];
  const logs = snapshot?.logs ?? [];`, `function Overview({ snapshot }: { snapshot: Snapshot }) {
  const participants = snapshot?.participants ?? [];
  const logs = snapshot?.logs ?? [];
  const chartKeys = participants.map((participant: any, index: number) => ({ ...participant, chartKey: \`participant_\${participant.id ?? index}\` }));`);
home = replaceOnce('Home.tsx', home, `      participants.forEach((participant: any) => {
        row[participant.displayName] = logs.filter((log: any) => log.participantId === participant.id && log.dayNumber <= day && log.dayComplete).length;
      });`, `      chartKeys.forEach((participant: any) => {
        row[participant.chartKey] = logs.filter((log: any) => log.participantId === participant.id && log.dayNumber <= day && log.dayComplete).length;
      });`);
home = replaceOnce('Home.tsx', home, `  }, [participants, logs, snapshot?.challenge?.currentDay]);`, `  }, [chartKeys, logs, snapshot?.challenge?.currentDay]);`);
home = replaceOnce('Home.tsx', home, `<section className="border border-[#2A2A2A] bg-[#101010] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <MicroLabel tone="gold">Live tracker</MicroLabel>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">People plotted, not listed.</h2>
          </div>
          <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Each line shows completed days by participant.</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -20, right: 16, top: 10, bottom: 0 }}>`, `<section className="sticky top-[68px] z-30 border border-[#2A2A2A] bg-[#101010]/98 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur sm:p-5 md:top-[78px]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone="gold">Live tracker</MicroLabel>
            <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-3xl">People plotted, not listed.</h2>
          </div>
          <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Each line shows completed days by participant.</p>
        </div>
        <div className="h-64 min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -8, right: 8, top: 10, bottom: 0 }}>`);
home = home.replace(/\{participants\.map\(\(participant: any, index: number\) => \(\n\s*<Line key=\{participant\.id\} type="monotone" dataKey=\{participant\.displayName\} stroke=\{chartColors\[index % chartColors\.length\]\} strokeWidth=\{3\} dot=\{false\} activeDot=\{\{ r: 6 \}\} \/>\n\s*\)\)\}/, `{chartKeys.map((participant: any, index: number) => (\n                <Line key={participant.id} type="monotone" dataKey={participant.chartKey} name={participant.displayName} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />\n              ))}`);
home = replaceOnce('Home.tsx', home, `<p className="mt-4 text-lg font-black uppercase text-white">{p.displayName}</p>`, `<p className="mt-4 break-words text-lg font-black uppercase text-white">{p.displayName}</p>`);
home = replaceOnce('Home.tsx', home, `<h3 className="mt-2 text-4xl font-black uppercase tracking-[-0.07em] text-white">{visibleParticipant.displayName}</h3>`, `<h3 className="mt-2 break-words text-3xl font-black uppercase tracking-[-0.07em] text-white sm:text-4xl">{visibleParticipant.displayName}</h3>`);
home = replaceOnce('Home.tsx', home, `className={classNames("grid w-full grid-cols-[56px_1fr_auto] items-center gap-4 border bg-[#0D0D0D] p-4 text-left transition hover:border-[#C8A96E]", index === 0 ? "border-l-4 border-l-[#C8A96E] border-[#3C3423]" : "border-[#2A2A2A]")}`, `className={classNames("grid w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-3 border bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4", index === 0 ? "border-l-4 border-l-[#C8A96E] border-[#3C3423]" : "border-[#2A2A2A]")}`);
home = replaceOnce('Home.tsx', home, `<span className={classNames("text-3xl font-black", index === 0 ? "text-[#C8A96E]" : "text-[#777]")}>#{index + 1}</span>`, `<span className={classNames("text-2xl font-black sm:text-3xl", index === 0 ? "text-[#C8A96E]" : "text-[#777]")}>#{index + 1}</span>`);
home = replaceOnce('Home.tsx', home, `<span>
              <span className="block text-xl font-black uppercase tracking-[-0.04em] text-white">{p.displayName}</span>`, `<span className="min-w-0">
              <span className="block break-words text-lg font-black uppercase tracking-[-0.04em] text-white sm:text-xl">{p.displayName}</span>`);
home = replaceOnce('Home.tsx', home, `<span className="text-right">
              <span className="block text-3xl font-black text-[#C8A96E]">{p.totalPoints}</span>`, `<span className="col-span-2 mt-2 text-left sm:col-span-1 sm:mt-0 sm:text-right">
              <span className="block text-2xl font-black text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>`);
home = replaceOnce('Home.tsx', home, `{log.exerciseProofUrl && <p className="mt-3 border border-[#2A2A2A] bg-[#111] p-3 text-xs font-bold text-[#C8A96E] break-all">Proof: {log.exerciseProofUrl}</p>}`, `{log.exerciseProofUrl && (log.exerciseProofUrl.startsWith("/manus-storage/") ? <img src={log.exerciseProofUrl} alt={\`Exercise proof for day \${log.dayNumber}\`} className="mt-3 max-h-72 w-full border border-[#2A2A2A] object-cover" /> : <p className="mt-3 break-all border border-[#2A2A2A] bg-[#111] p-3 text-xs font-bold text-[#C8A96E]">Proof: {log.exerciseProofUrl}</p>)}`);
home = replaceOnce('Home.tsx', home, `const [entryVisible, setEntryVisible] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("sixone-entry-seen") !== "true");`, `const [entryVisible, setEntryVisible] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("sixone-entry-seen") !== "true");
  const [loginEntryVisible, setLoginEntryVisible] = useState(false);
  const previousAuthRef = useRef(isAuthenticated);`);
home = replaceOnce('Home.tsx', home, `  useEffect(() => {
    if (loading || !entryVisible || typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("sixone-entry-seen", "true");
      setEntryVisible(false);
    }, prefersReducedMotion ? 120 : 950);
    return () => window.clearTimeout(timer);
  }, [entryVisible, loading]);

  if (loading || entryVisible) return <AnimatedLoadPage label={loading ? "Authenticating" : "Entering the log"} />;`, `  useEffect(() => {
    if (loading || !entryVisible || typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("sixone-entry-seen", "true");
      setEntryVisible(false);
    }, prefersReducedMotion ? 120 : 950);
    return () => window.clearTimeout(timer);
  }, [entryVisible, loading]);

  useEffect(() => {
    if (loading) return;
    const justAuthenticated = isAuthenticated && !previousAuthRef.current;
    previousAuthRef.current = isAuthenticated;
    if (!justAuthenticated || typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLoginEntryVisible(true);
    const timer = window.setTimeout(() => setLoginEntryVisible(false), prefersReducedMotion ? 120 : 950);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, loading]);

  if (loading || entryVisible || loginEntryVisible) return <AnimatedLoadPage label={loading ? "Authenticating" : loginEntryVisible ? "Opening your challenge" : "Entering the log"} />;`);

fs.writeFileSync(homePath, home);

let register = fs.readFileSync(registerPath, 'utf8');
if (!register.includes('import { useState } from "react";')) {
  register = register.replace(/^\s*/, 'import { useState } from "react";\n');
}
fs.writeFileSync(registerPath, register);

let routers = fs.readFileSync(routersPath, 'utf8');
routers = replaceOnce('routers.ts', routers, 'import { generateWardenCommentary } from "./warden";', 'import { generateWardenCommentary } from "./warden";\nimport { storagePut } from "./storage";');
routers = replaceOnce('routers.ts', routers, `    submitMyDay: protectedProcedure.input(dayLogInput).mutation(async ({ ctx, input }) => {
      const participant = await getOrCreateParticipant(ctx.user);
      const result = await submitDailyLog(participant.id, input);
      if (!result.complete) {
        await triggerLifeLoss(participant.id, \`Missed rule(s): \${result.missedRules.join(", ")}\`, result.log?.id ?? null);
      }
      return result;
    }),`, `    submitMyDay: protectedProcedure.input(dayLogInput).mutation(async ({ ctx, input }) => {
      const participant = await getOrCreateParticipant(ctx.user);
      const result = await submitDailyLog(participant.id, input);
      if (!result.complete) {
        await triggerLifeLoss(participant.id, \`Missed rule(s): \${result.missedRules.join(", ")}\`, result.log?.id ?? null);
      }
      return result;
    }),

    uploadProof: protectedProcedure
      .input(z.object({
        fileName: z.string().trim().min(1).max(180),
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        dataUrl: z.string().max(6_000_000).regex(/^data:image\\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Proof image must be a PNG, JPG, or WEBP data URL."),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await getOrCreateParticipant(ctx.user);
        const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const base64 = input.dataUrl.split(",")[1] ?? "";
        const bytes = Buffer.from(base64, "base64");
        if (bytes.length === 0 || bytes.length > 4_000_000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Proof image must be under 4MB." });
        }
        const safeName = input.fileName.replace(/[^a-z0-9._-]/gi, "-").slice(0, 80) || "exercise-proof";
        const stored = await storagePut(\`exercise-proof/participant-\${participant.id}/\${Date.now()}-\${safeName}.\${extension}\`, bytes, input.mimeType);
        return { success: true, url: stored.url, key: stored.key } as const;
      }),`);
fs.writeFileSync(routersPath, routers);

let index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('site.webmanifest')) {
  index = index.replace('    <title>6+1 4 Lives Challenge</title>    ', '    <title>6+1 4 Lives Challenge</title>\n    <meta name="theme-color" content="#0D0D0D" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-title" content="6+1 Challenge" />\n    <link rel="manifest" href="/site.webmanifest" />\n    <link rel="icon" type="image/webp" href="/manus-storage/six-plus-one-brand-logo-white-strong_2949fb51.webp" />\n    <link rel="apple-touch-icon" href="/manus-storage/six-plus-one-brand-logo-white-strong_2949fb51.webp" />    ');
}
fs.writeFileSync(indexPath, index);

fs.writeFileSync(manifestPath, JSON.stringify({
  name: '6+1 4 Lives Challenge',
  short_name: '6+1',
  description: 'Daily logging, lives, proof, leaderboard, and accountability for the 6+1 Four Lives Challenge.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#0D0D0D',
  theme_color: '#0D0D0D',
  icons: [
    { src: '/manus-storage/six-plus-one-brand-logo-white-strong_2949fb51.webp', sizes: '192x192', type: 'image/webp', purpose: 'any maskable' },
    { src: '/manus-storage/six-plus-one-brand-logo-white-strong_2949fb51.webp', sizes: '512x512', type: 'image/webp', purpose: 'any maskable' }
  ]
}, null, 2) + '\n');

console.log('Applied v5 bug-fix patch.');
