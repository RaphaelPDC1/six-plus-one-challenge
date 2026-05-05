import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Activity, Crown, Flame, Gift, Heart, Lock, MessageSquare, Shield, Trophy, UserRound, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Snapshot = any;

type MyDayForm = {
  noAlcohol: boolean;
  cleanEating: boolean;
  cleanEatingNote: string;
  exerciseDuration: number;
  exerciseType: string;
  exerciseProofUrl: string;
  reflectionText: string;
  reflectionShared: boolean;
  readTeachText: string;
  trackedEverything: boolean;
};

const emptyDay: MyDayForm = {
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
};

function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0b0f0c] text-stone-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,0.22),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.16),transparent_25%),linear-gradient(135deg,#0b0f0c,#141a14_48%,#0f1511)]" />
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-12">
        <nav className="absolute left-6 right-6 top-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-lime-300/30 bg-lime-300/10 text-lime-200 shadow-lg shadow-lime-950/40">6+1</div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-lime-200/80">Four Lives</p>
              <p className="text-xs text-stone-400">50-day accountability system</p>
            </div>
          </div>
          <Button onClick={() => (window.location.href = getLoginUrl())} className="rounded-full bg-lime-300 text-stone-950 hover:bg-lime-200">
            <UserRound className="mr-2 h-4 w-4" /> Enter Tracker
          </Button>
        </nav>
        <div className="grid items-center gap-12 pt-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge className="mb-6 border-lime-300/30 bg-lime-300/10 text-lime-100">Starts with discipline. Stays alive through narrative.</Badge>
            <h1 className="max-w-4xl text-6xl font-black leading-[0.92] tracking-tight md:text-8xl">
              The 6+1 challenge tracker for people who need the group to see it.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300">
              A private daily log, public leaderboard, four lives, Monzo penalty prompts, Ghost Life recovery, Pure Sport rewards, and the Warden commentator turning raw activity into group momentum.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => (window.location.href = getLoginUrl())} className="rounded-full bg-lime-300 px-7 text-stone-950 hover:bg-lime-200">Start logging</Button>
              <Button size="lg" variant="outline" className="rounded-full border-stone-600 bg-transparent px-7 text-stone-100 hover:bg-stone-900">View the system</Button>
            </div>
          </div>
          <Card className="border-stone-700/70 bg-stone-950/70 text-stone-50 shadow-2xl shadow-black/40 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl"><Shield className="text-lime-300" /> The operating loop</CardTitle>
              <CardDescription className="text-stone-400">Log privately. Compete publicly. Get narrated by the Warden.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["Six daily rules decide the day", "Any missed rule can cost one life", "A £25 Monzo request appears immediately", "Checkpoint points unlock Pure Sport rewards", "The Warden comments with a three-message daily cap"].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-300 text-sm font-black text-stone-950">{index + 1}</span>
                  <span className="text-stone-200">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon: Icon, tone = "lime" }: { label: string; value: string | number; icon: any; tone?: "lime" | "amber" | "rose" | "sky" }) {
  const colors = { lime: "bg-lime-100 text-lime-900", amber: "bg-amber-100 text-amber-900", rose: "bg-rose-100 text-rose-900", sky: "bg-sky-100 text-sky-900" };
  return (
    <Card className="border-0 bg-white/85 shadow-sm ring-1 ring-stone-200/70 backdrop-blur">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-stone-950">{value}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${colors[tone]}`}><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}

function MyDay({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const [form, setForm] = useState<MyDayForm>(emptyDay);
  const [lastMissed, setLastMissed] = useState<string[]>([]);
  const submit = trpc.challenge.submitMyDay.useMutation({
    onSuccess: data => {
      setLastMissed(data.missedRules);
      toast(data.complete ? "Day complete — points added." : "Incomplete day logged — life-loss prompt generated.");
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const ghost = trpc.challenge.applyGhostLife.useMutation({ onSuccess: () => { toast("Ghost Life check complete."); refetch(); } });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-0 shadow-sm ring-1 ring-stone-200/80">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl"><Lock className="h-5 w-5 text-stone-600" /> My Day</CardTitle>
              <CardDescription>Private checklist for you only. Public feeds only use shared insights and proof.</CardDescription>
            </div>
            <Badge variant="outline">Day {snapshot?.challenge.currentDay ?? 1}/50</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border p-4"><Checkbox checked={form.noAlcohol} onCheckedChange={v => setForm({ ...form, noAlcohol: Boolean(v) })} /> No alcohol</label>
            <label className="flex items-center gap-3 rounded-2xl border p-4"><Checkbox checked={form.cleanEating} onCheckedChange={v => setForm({ ...form, cleanEating: Boolean(v) })} /> Clean eating</label>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-lime-200 bg-lime-50 p-4"><Checkbox checked={form.trackedEverything} onCheckedChange={v => setForm({ ...form, trackedEverything: Boolean(v) })} /> Track everything before submitting</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Exercise minutes</Label><Input type="number" value={form.exerciseDuration} onChange={e => setForm({ ...form, exerciseDuration: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Exercise type</Label><Input value={form.exerciseType} onChange={e => setForm({ ...form, exerciseType: e.target.value })} placeholder="Run, gym, mobility..." /></div>
          </div>
          <div className="space-y-2"><Label>Proof URL or note</Label><Input value={form.exerciseProofUrl} onChange={e => setForm({ ...form, exerciseProofUrl: e.target.value })} placeholder="Photo link, Strava link, or proof note" /></div>
          <div className="space-y-2"><Label>Daily reflection</Label><Textarea value={form.reflectionText} onChange={e => setForm({ ...form, reflectionText: e.target.value })} placeholder="What did today reveal?" /></div>
          <div className="space-y-2"><Label>Read & Teach insight</Label><Textarea value={form.readTeachText} onChange={e => setForm({ ...form, readTeachText: e.target.value })} placeholder="One useful idea for the group..." /></div>
          <label className="flex items-center gap-3 rounded-2xl bg-stone-50 p-4"><Checkbox checked={form.reflectionShared} onCheckedChange={v => setForm({ ...form, reflectionShared: Boolean(v) })} /> Share this insight to Proof Feed</label>
          <Button className="w-full rounded-2xl bg-stone-950 py-6 text-base hover:bg-stone-800" disabled={submit.isPending} onClick={() => submit.mutate({ ...form, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>Submit My Day</Button>
          {lastMissed.length > 0 && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Missed rules: {lastMissed.join(", ")}. A Monzo penalty obligation has been logged for founder confirmation.</div>}
        </CardContent>
      </Card>
      <div className="space-y-6">
        <StatCard label="My lives" value={snapshot?.participant.livesRemaining ?? 4} icon={Heart} tone="rose" />
        <StatCard label="My points" value={snapshot?.participant.totalPoints ?? 0} icon={Trophy} tone="amber" />
        <StatCard label="Current streak" value={snapshot?.participant.currentStreak ?? 0} icon={Flame} />
        <Card className="border-0 shadow-sm ring-1 ring-stone-200/80">
          <CardHeader><CardTitle>Ghost Life</CardTitle><CardDescription>One non-repeatable Double-Down recovery: 60 minutes exercise and 2 insights.</CardDescription></CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full rounded-2xl" disabled={ghost.isPending || snapshot?.participant.ghostLifeUsed} onClick={() => ghost.mutate({ exerciseDuration: form.exerciseDuration, insightCount: form.readTeachText.split(".").filter(Boolean).length })}>
              {snapshot?.participant.ghostLifeUsed ? "Ghost Life already used" : "Check Ghost Life eligibility"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const chartData = useMemo(() => {
    const days = Array.from({ length: snapshot?.challenge.totalDays ?? 50 }, (_, i) => ({ day: i + 1, completed: 0 }));
    snapshot?.logs.forEach((log: any) => {
      const day = days[log.dayNumber - 1];
      if (day && log.dayComplete) day.completed += 1;
    });
    return days.slice(0, Math.max(snapshot?.challenge.currentDay ?? 1, 10));
  }, [snapshot]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4"><StatCard label="Challenge day" value={snapshot?.challenge.currentDay ?? 1} icon={Activity} tone="sky" /><StatCard label="Participants" value={snapshot?.participants.length ?? 0} icon={UserRound} /><StatCard label="Pending payments" value={snapshot?.payments.filter((p: any) => p.status === "pending").length ?? 0} icon={Zap} tone="rose" /><StatCard label="Reward requests" value={snapshot?.redemptions.filter((r: any) => r.status === "pending").length ?? 0} icon={Gift} tone="amber" /></div>
      <Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Group progress graph</CardTitle><CardDescription>Completed daily logs across the group by challenge day.</CardDescription></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="completed" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#84cc16" stopOpacity={0.45}/><stop offset="95%" stopColor="#84cc16" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4"/><XAxis dataKey="day"/><YAxis allowDecimals={false}/><Tooltip/><Area type="monotone" dataKey="completed" stroke="#65a30d" fill="url(#completed)" strokeWidth={3}/></AreaChart></ResponsiveContainer></CardContent></Card>
      <Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Lives grid</CardTitle><CardDescription>Everyone's lives are public. Their My Day checklist is not.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{snapshot?.participants.map((p: any) => <div key={p.id} className="rounded-3xl border bg-white p-5"><div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-950 font-bold text-white">{p.avatarInitials}</div><Badge>{p.livesRemaining}/4 lives</Badge></div><p className="mt-4 font-bold text-stone-950">{p.displayName}</p><div className="mt-3 flex gap-1">{Array.from({ length: 4 }).map((_, i) => <Heart key={i} className={`h-5 w-5 ${i < p.livesRemaining ? "fill-rose-500 text-rose-500" : "text-stone-250"}`} />)}</div></div>)}</CardContent></Card>
    </div>
  );
}

function Leaderboard({ snapshot }: { snapshot: Snapshot }) {
  const ranked = [...(snapshot?.participants ?? [])].sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.currentStreak - a.currentStreak);
  return <Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Leaderboard</CardTitle><CardDescription>Ranked by points first, then current streak.</CardDescription></CardHeader><CardContent className="space-y-3">{ranked.map((p: any, index) => <div key={p.id} className="flex items-center justify-between rounded-3xl border bg-white p-4"><div className="flex items-center gap-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-100 font-black text-lime-900">#{index + 1}</span><div><p className="font-bold text-stone-950">{p.displayName}</p><p className="text-sm text-stone-500">{p.currentStreak} day streak · {p.daysComplete} days complete</p></div></div><div className="text-right"><p className="text-2xl font-black">{p.totalPoints}</p><p className="text-xs text-stone-500">points</p></div></div>)}</CardContent></Card>;
}

function ProofFeed({ snapshot }: { snapshot: Snapshot }) {
  const publicLogs = (snapshot?.logs ?? []).filter((log: any) => log.reflectionShared || log.exerciseProofUrl || log.readTeachText);
  return <Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Proof Feed</CardTitle><CardDescription>Public proof, shared reflections, and Read & Teach insights. Private My Day checklist detail stays private.</CardDescription></CardHeader><CardContent className="space-y-4">{publicLogs.map((log: any) => { const owner = snapshot?.participants.find((p: any) => p.id === log.participantId); return <article key={log.id} className="rounded-3xl border bg-white p-5"><div className="flex items-center justify-between"><p className="font-bold text-stone-950">{owner?.displayName ?? "Participant"}</p><Badge variant="outline">Day {log.dayNumber}</Badge></div>{log.readTeachText && <p className="mt-3 text-stone-700"><strong>Read & Teach:</strong> {log.readTeachText}</p>}{log.reflectionShared && log.reflectionText && <p className="mt-3 text-stone-600"><strong>Reflection:</strong> {log.reflectionText}</p>}{log.exerciseProofUrl && <p className="mt-3 text-sm text-stone-500"><strong>Proof:</strong> {log.exerciseProofUrl}</p>}</article>; })}{publicLogs.length === 0 && <p className="rounded-3xl bg-stone-50 p-6 text-stone-500">No public proof yet. Shared insights will appear here.</p>}</CardContent></Card>;
}

function Rewards({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const redeem = trpc.challenge.redeemReward.useMutation({ onSuccess: () => { toast("Redemption request logged for founders."); refetch(); }, onError: e => toast.error(e.message) });
  return <div className="grid gap-6 lg:grid-cols-[1fr_380px]"><div className="grid gap-4 md:grid-cols-2">{snapshot?.rewards.map((reward: any) => <Card key={reward.id} className={`cursor-pointer border-0 shadow-sm ring-1 ${selected === reward.id ? "ring-lime-500" : "ring-stone-200/80"}`} onClick={() => setSelected(reward.id)}><CardHeader><CardTitle>{reward.name}</CardTitle><CardDescription>{reward.description}</CardDescription></CardHeader><CardContent><Badge>{reward.pointsCost} points</Badge></CardContent></Card>)}</div><Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Request reward</CardTitle><CardDescription>Founders manually order with Pure Sport and mark fulfilled.</CardDescription></CardHeader><CardContent className="space-y-3"><Input placeholder="Delivery name" value={deliveryName} onChange={e => setDeliveryName(e.target.value)} /><Textarea placeholder="Delivery address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} /><Button className="w-full rounded-2xl" disabled={!selected || redeem.isPending} onClick={() => selected && redeem.mutate({ rewardId: selected, deliveryName, deliveryAddress, checkpointEarned: `Day ${snapshot?.challenge.currentDay ?? 1}` })}>Submit redemption</Button></CardContent></Card></div>;
}

function AdminPanel({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { toast("Payment marked received."); refetch(); } });
  const fulfill = trpc.admin.fulfillRedemption.useMutation({ onSuccess: () => { toast("Redemption marked fulfilled."); refetch(); } });
  return <div className="grid gap-6 xl:grid-cols-2"><Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Monzo payment obligations</CardTitle><CardDescription>Offline confirmation by founders. Life loss is already logged in Supabase.</CardDescription></CardHeader><CardContent className="space-y-3">{snapshot?.payments.map((payment: any) => { const owner = snapshot?.participants.find((p: any) => p.id === payment.participantId); return <div key={payment.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{owner?.displayName ?? "Participant"}</p><p className="text-sm text-stone-500">£{(payment.amountPence / 100).toFixed(2)} · {payment.reason}</p><p className="text-xs text-stone-400 break-all">{payment.paymentLink}</p></div><Badge>{payment.status}</Badge></div>{payment.status === "pending" && <Button className="mt-3 rounded-xl" size="sm" onClick={() => confirmPayment.mutate({ paymentId: payment.id })}>Mark received</Button>}</div>; })}</CardContent></Card><Card className="border-0 shadow-sm ring-1 ring-stone-200/80"><CardHeader><CardTitle>Pure Sport redemptions</CardTitle><CardDescription>Human-in-the-loop founder fulfilment.</CardDescription></CardHeader><CardContent className="space-y-3">{snapshot?.redemptions.map((request: any) => { const owner = snapshot?.participants.find((p: any) => p.id === request.participantId); const reward = snapshot?.rewards.find((r: any) => r.id === request.rewardId); return <div key={request.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{owner?.displayName ?? "Participant"} · {reward?.name ?? "Reward"}</p><p className="text-sm text-stone-500">{request.checkpointEarned}</p><p className="text-xs text-stone-400 whitespace-pre-wrap">{request.deliveryAddress}</p></div><Badge>{request.status}</Badge></div>{request.status === "pending" && <Button className="mt-3 rounded-xl" size="sm" onClick={() => fulfill.mutate({ redemptionId: request.id })}>Mark fulfilled</Button>}</div>; })}</CardContent></Card><Card className="border-0 shadow-sm ring-1 ring-stone-200/80 xl:col-span-2"><CardHeader><CardTitle>Warden and WhatsApp context</CardTitle><CardDescription>Stored Warden messages and the latest captured WhatsApp messages.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2"><div className="space-y-3">{snapshot?.wardenMessages.map((m: any) => <div key={m.id} className="rounded-2xl bg-stone-50 p-4"><Badge variant="outline">{m.mode}</Badge><p className="mt-2 text-sm text-stone-700">{m.content}</p></div>)}</div><div className="space-y-3">{snapshot?.chatHistory.map((m: any) => <div key={m.id} className="rounded-2xl border p-4"><p className="font-semibold">{m.senderName || m.senderId}</p><p className="text-sm text-stone-600">{m.messageText}</p></div>)}</div></CardContent></Card></div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const snapshotQuery = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const snapshot = snapshotQuery.data;

  if (loading) return <div className="grid min-h-screen place-items-center bg-stone-100 text-stone-700">Loading the challenge...</div>;
  if (!isAuthenticated) return <Landing />;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f4f1ea]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-stone-950 font-black text-lime-300">6+1</div><div><p className="font-black">Four Lives Challenge</p><p className="text-xs text-stone-500">Private My Day · public accountability · Warden commentary</p></div></div>
          <div className="flex items-center gap-3"><Badge variant="outline">{user?.role === "admin" ? "Founder" : "Participant"}</Badge><Button variant="outline" className="rounded-full" onClick={() => logout()}>Logout</Button></div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px]"><div><p className="text-sm uppercase tracking-[0.28em] text-lime-700">Day {snapshot?.challenge.currentDay ?? "—"} of 50</p><h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">Accountability with teeth.</h1><p className="mt-4 max-w-3xl text-stone-600">The tracker keeps the personal log private, makes group progress visible, and gives founders control over penalties, rewards, WhatsApp context, and Warden output.</p></div><Card className="border-0 bg-stone-950 text-white shadow-lg"><CardContent className="p-5"><p className="text-sm text-stone-400">Warden rule</p><p className="mt-2 text-2xl font-black">Max 3 unprompted messages per day</p><p className="mt-3 text-sm text-stone-300">Built for narrative, not noise.</p></CardContent></Card></div>
        {snapshotQuery.isLoading ? <div className="rounded-3xl bg-white p-10 text-center shadow-sm">Loading challenge data...</div> : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid h-auto grid-cols-2 rounded-3xl bg-white p-2 shadow-sm md:grid-cols-6"><TabsTrigger value="overview" className="rounded-2xl">Overview</TabsTrigger><TabsTrigger value="leaderboard" className="rounded-2xl">Leaderboard</TabsTrigger><TabsTrigger value="proof" className="rounded-2xl">Proof Feed</TabsTrigger><TabsTrigger value="myday" className="rounded-2xl">My Day</TabsTrigger><TabsTrigger value="rewards" className="rounded-2xl">Rewards</TabsTrigger><TabsTrigger value="admin" className="rounded-2xl">Founder</TabsTrigger></TabsList>
            <TabsContent value="overview"><Overview snapshot={snapshot} /></TabsContent>
            <TabsContent value="leaderboard"><Leaderboard snapshot={snapshot} /></TabsContent>
            <TabsContent value="proof"><ProofFeed snapshot={snapshot} /></TabsContent>
            <TabsContent value="myday"><MyDay snapshot={snapshot} refetch={snapshotQuery.refetch} /></TabsContent>
            <TabsContent value="rewards"><Rewards snapshot={snapshot} refetch={snapshotQuery.refetch} /></TabsContent>
            <TabsContent value="admin">{user?.role === "admin" ? <AdminPanel snapshot={snapshot} refetch={snapshotQuery.refetch} /> : <Card className="border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-8"><Crown className="text-amber-600" /><p>Founder dashboard is restricted to admin users.</p></CardContent></Card>}</TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  );
}
