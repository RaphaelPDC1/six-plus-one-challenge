import { readFileSync, writeFileSync } from "node:fs";

const file = "/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx";
const source = readFileSync(file, "utf8");
const start = source.indexOf("function SiteEntryPanel() {");
const end = source.indexOf("\n\nconst challengeStats", start);

if (start === -1 || end === -1) {
  throw new Error("Could not locate SiteEntryPanel block");
}

const replacement = String.raw`function SiteEntryPanel() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [entryMode, setEntryMode] = useState<"choice" | "register" | "login">("choice");
  const [personalization, setPersonalization] = useState<PersonalizationForm>({
    primaryGoal: "",
    biggestObstacle: "",
    trainingLevel: "building",
    motivationStyle: "direct",
    supportNeeded: "",
  });
  const utils = trpc.useUtils();
  const siteLogin = trpc.auth.siteLogin.useMutation({
    onSuccess: async () => {
      haptics.success();
      toast(entryMode === "register" ? "Registered. The Warden has your context." : "Welcome back. You are in.");
      await utils.auth.me.invalidate();
      await utils.challenge.snapshot.invalidate();
    },
    onError: error => {
      haptics.warning();
      toast(error.message || "Could not start your 6+1 session.");
    },
  });

  const updatePersonalization = <Key extends keyof PersonalizationForm>(key: Key, value: PersonalizationForm[Key]) => {
    setPersonalization(current => ({ ...current, [key]: value }));
  };

  const chooseMode = (mode: "register" | "login") => {
    haptics.tap();
    setEntryMode(mode);
  };

  const resetEntry = () => {
    haptics.tap();
    setEntryMode("choice");
  };

  return (
    <form
      id="site-entry-panel"
      className="mt-8 scroll-mt-10 border border-[#2A2A2A] bg-[#090909]/94 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70 sm:p-5"
      onSubmit={event => {
        event.preventDefault();
        if (entryMode === "choice") return;
        haptics.submit();
        siteLogin.mutate({
          email,
          displayName: entryMode === "register" ? displayName : undefined,
          mode: entryMode,
          personalization: entryMode === "register" ? personalization : undefined,
        });
      }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#C8A96E]/70 text-[#C8A96E]">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <MicroLabel tone="gold">Register or log in</MicroLabel>
          <p className="mt-2 text-sm font-bold leading-6 text-[#AFAFAF]">
            New challenger? Register first. Already made your profile? Log in with your email.
          </p>
        </div>
      </div>

      {entryMode === "choice" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="entry-choice-panel">
          <button
            type="button"
            onClick={() => chooseMode("register")}
            className="group min-h-28 border border-[#C8A96E]/70 bg-[#C8A96E] p-4 text-left text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(200,169,110,0.20)] focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:ring-offset-2 focus:ring-offset-black"
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/60">New challenger</span>
            <span className="mt-2 block text-2xl font-black uppercase tracking-[-0.05em]">Register</span>
            <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em] text-black/70">Answer five quick questions after this click.</span>
          </button>
          <button
            type="button"
            onClick={() => chooseMode("login")}
            className="group min-h-28 border border-[#2A2A2A] bg-black p-4 text-left text-white transition hover:-translate-y-0.5 hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Returning member</span>
            <span className="mt-2 block text-2xl font-black uppercase tracking-[-0.05em]">Log in</span>
            <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em] text-[#888]">Email only. No questionnaire.</span>
          </button>
        </div>
      ) : (
        <div className="mt-5" data-testid={entryMode === "register" ? "registration-flow-panel" : "login-flow-panel"}>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#2A2A2A] pb-3">
            <div>
              <MicroLabel tone={entryMode === "register" ? "gold" : "white"}>{entryMode === "register" ? "New registration" : "Returning login"}</MicroLabel>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#777]">
                {entryMode === "register" ? "Five answers help personalise the journey." : "Use the email already attached to your challenger profile."}
              </p>
            </div>
            <button type="button" onClick={resetEntry} className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E] underline-offset-4 hover:underline">
              Back
            </button>
          </div>

          <div className={entryMode === "register" ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
            <input
              required
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="min-h-12 border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]"
            />
            {entryMode === "register" && (
              <input
                required
                type="text"
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                placeholder="Display name"
                className="min-h-12 border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]"
              />
            )}
          </div>

          {entryMode === "register" && (
            <div className="mt-4 grid gap-3" data-testid="registration-personalization">
              <div className="grid gap-3 lg:grid-cols-2">
                <label>
                  <MicroLabel tone="gold">1. Main goal</MicroLabel>
                  <input required value={personalization.primaryGoal} onChange={event => updatePersonalization("primaryGoal", event.target.value)} placeholder="What are you here to change?" className="mt-2 min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]" />
                </label>
                <label>
                  <MicroLabel tone="gold">2. Training level</MicroLabel>
                  <select required value={personalization.trainingLevel} onChange={event => updatePersonalization("trainingLevel", event.target.value as PersonalizationForm["trainingLevel"])} className="mt-2 min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition focus:border-[#C8A96E]">
                    {trainingLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <MicroLabel tone="gold">3. Biggest obstacle</MicroLabel>
                <textarea required value={personalization.biggestObstacle} onChange={event => updatePersonalization("biggestObstacle", event.target.value)} placeholder="What usually knocks you off track?" className="mt-2 min-h-20 w-full border border-[#2A2A2A] bg-black px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]" />
              </label>
              <div className="grid gap-3 lg:grid-cols-2">
                <label>
                  <MicroLabel tone="gold">4. Warden style</MicroLabel>
                  <select required value={personalization.motivationStyle} onChange={event => updatePersonalization("motivationStyle", event.target.value as PersonalizationForm["motivationStyle"])} className="mt-2 min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition focus:border-[#C8A96E]">
                    {motivationStyles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <MicroLabel tone="gold">5. Support needed</MicroLabel>
                  <input required value={personalization.supportNeeded} onChange={event => updatePersonalization("supportNeeded", event.target.value)} placeholder="What should the group/Warden know?" className="mt-2 min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]" />
                </label>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">
              {entryMode === "register" ? "Register creates your challenger profile and saves your five answers." : "Log in reopens an existing challenger profile by email."}
            </p>
            <SharpButton type="submit" disabled={siteLogin.isPending} className="min-w-40">
              {siteLogin.isPending ? "Opening" : entryMode === "register" ? "Complete registration" : "Log in"}
            </SharpButton>
          </div>
        </div>
      )}
    </form>
  );
}`;

writeFileSync(file, source.slice(0, start) + replacement + source.slice(end), "utf8");
