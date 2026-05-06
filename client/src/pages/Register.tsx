import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Camera, Mail, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { haptics } from "@/lib/haptics";

const BRAND_LOGO_URL = "/manus-storage/six-plus-one-reference-palette-logo-transparent_9ff37cae.png";

type TrainingLevel = "starting" | "building" | "consistent" | "advanced";

const trainingLevels = [
  ["starting", "Starting again"],
  ["building", "Building consistency"],
  ["consistent", "Already consistent"],
  ["advanced", "Advanced / pushing hard"],
] as const;

function MicroLabel({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" | "red" | "green" }) {
  const tones = {
    muted: "text-[#777]",
    gold: "text-[#C8A96E]",
    red: "text-[#C0392B]",
    green: "text-[#2ECC71]",
  };
  return <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tones[tone]}`}>{children}</span>;
}

function LogoMark() {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center border border-[#C8A96E]/70 bg-[#080808] p-2 shadow-[0_0_28px_rgba(200,169,110,0.10)]" aria-label="6+1 logo">
      <img
        src={BRAND_LOGO_URL}
        alt="6+1"
        data-testid="brand-logo"
        data-logo-source="reference-palette-logo"
        className="h-full w-full object-contain"
        decoding="async"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}

function SharpButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return <button {...rest} className={`inline-flex min-h-12 items-center justify-center gap-2 border border-[#C8A96E] bg-[#C8A96E] px-5 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <MicroLabel tone="gold">{label}</MicroLabel>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass = "min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]";
const textAreaClass = "min-h-24 w-full border border-[#2A2A2A] bg-black px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]";

export default function Register() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>("building");
  const [biggestObstacle, setBiggestObstacle] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [groupContext, setGroupContext] = useState("");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | undefined>();

  function handlePhoto(file?: File) {
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      toast.error("Use a PNG, JPG, or WEBP profile photo.");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("Profile photo must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  const register = trpc.auth.siteLogin.useMutation({
    onSuccess: async () => {
      haptics.success();
      toast("Registered. The Warden will adapt from your challenge data and group-chat signals.");
      await utils.auth.me.invalidate();
      await utils.challenge.snapshot.invalidate();
      setLocation("/");
    },
    onError: error => {
      haptics.warning();
      toast(error.message || "Could not complete registration.");
    },
  });

  const combinedSupport = [
    supportNeeded.trim() ? `Support needed: ${supportNeeded.trim()}` : "",
    groupContext.trim() ? `Group-chat context: ${groupContext.trim()}` : "",
  ].filter(Boolean).join("\n");

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] text-white">
      <section className="container py-6 md:py-8">
        <nav className="flex flex-col items-start gap-4 border-b border-[#2A2A2A] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <div>
              <MicroLabel tone="gold">6+1 registration</MicroLabel>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-white">Five answers. One universal Warden.</p>
            </div>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#2A2A2A] bg-black px-4 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-[#C8A96E] hover:text-[#C8A96E]"><ArrowLeft className="h-4 w-4" /> Back home</Link>
        </nav>

        <div className="grid gap-6 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <aside className="border border-[#2A2A2A] bg-[#101010] p-5 lg:sticky lg:top-6">
            <MicroLabel tone="red">New challenger</MicroLabel>
            <h1 className="mt-4 text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white md:text-7xl">Register once.</h1>
            <p className="mt-5 text-sm font-bold leading-7 text-[#BDBDBD]">This page keeps the home page clean. Your answers give the app enough context to start the journey, but you do not choose a Warden type.</p>
            <div className="mt-5 border border-[#C8A96E]/50 bg-black p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-1 h-5 w-5 text-[#C8A96E]" />
                <div>
                  <MicroLabel tone="gold">Universal Warden</MicroLabel>
                  <p className="mt-2 text-sm font-black leading-6 text-white">The Warden adapts from what you log in the app and what appears in the group-chat context. No style picker needed.</p>
                </div>
              </div>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Already registered? Use email-only log in on the home page.</p>
          </aside>

          <form
            className="border border-[#2A2A2A] bg-[#090909]/94 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] sm:p-5"
            data-testid="dedicated-registration-form"
            onSubmit={event => {
              event.preventDefault();
              haptics.submit();
              register.mutate({
                email,
                displayName,
                mode: "register",
                profilePhotoDataUrl,
                personalization: {
                  primaryGoal,
                  biggestObstacle,
                  trainingLevel,
                  supportNeeded: combinedSupport,
                },
              });
            }}
          >
            <div className="flex items-start gap-3 border-b border-[#2A2A2A] pb-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#C8A96E]/70 text-[#C8A96E]"><UserRound className="h-4 w-4" /></div>
              <div>
                <MicroLabel tone="gold">Registration questions</MicroLabel>
                <p className="mt-2 text-sm font-bold leading-6 text-[#AFAFAF]">Answer these once. The home page stays for the challenge overview and returning-member login.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Email"><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@email.com" className={inputClass} /></Field>
              <Field label="Display name"><input required type="text" value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="How the board should show you" className={inputClass} /></Field>
            </div>

            <label className="mt-5 grid cursor-pointer gap-3 border border-dashed border-[#C8A96E]/70 bg-black/40 p-4 text-[#C8A96E] transition hover:bg-[#17120A] sm:grid-cols-[96px_1fr] sm:items-center">
              <span className="grid h-24 w-24 place-items-center overflow-hidden border border-[#C8A96E]/60 bg-black text-center">
                {profilePhotoDataUrl ? <img src={profilePhotoDataUrl} alt="Profile preview" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Camera className="h-6 w-6" />Photo</span>}
              </span>
              <span>
                <MicroLabel tone="gold">Display picture</MicroLabel>
                <span className="mt-2 block text-sm font-bold leading-6 text-[#AFAFAF]">Add the photo competitors will see beside your name in the game, leaderboard, proof feed, and admin payment list.</span>
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => handlePhoto(event.target.files?.[0])} />
            </label>

            <div className="mt-5 grid gap-4">
              <Field label="1. Main goal"><input required value={primaryGoal} onChange={event => setPrimaryGoal(event.target.value)} placeholder="What are you here to change?" className={inputClass} /></Field>
              <Field label="2. Current training level"><select required value={trainingLevel} onChange={event => setTrainingLevel(event.target.value as TrainingLevel)} className={inputClass}>{trainingLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="3. Biggest obstacle"><textarea required value={biggestObstacle} onChange={event => setBiggestObstacle(event.target.value)} placeholder="What usually knocks you off track?" className={textAreaClass} /></Field>
              <Field label="4. Support needed"><textarea required value={supportNeeded} onChange={event => setSupportNeeded(event.target.value)} placeholder="What support would help you stay locked in?" className={textAreaClass} /></Field>
              <Field label="5. Group-chat context"><textarea required value={groupContext} onChange={event => setGroupContext(event.target.value)} placeholder="What should the group know about how you show up, disappear, or need accountability?" className={textAreaClass} /></Field>
            </div>

            <div className="mt-5 grid gap-3 border-t border-[#2A2A2A] pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">No Warden type selection. The Warden learns from app data and group-chat signals.</p>
              <SharpButton type="submit" disabled={register.isPending}><Mail className="h-4 w-4" />{register.isPending ? "Registering" : "Complete registration"}</SharpButton>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
