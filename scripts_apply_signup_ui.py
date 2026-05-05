from pathlib import Path

home_path = Path('/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx')
home = home_path.read_text()

# Add Mail icon for the access request form if it is not already imported.
if '  Mail,' not in home:
    home = home.replace('  Lock,\n', '  Lock,\n  Mail,\n')

signup_component = r'''
function SignupAccessForm() {
  const [email, setEmail] = useState("");
  const requestAccess = trpc.signup.requestAccess.useMutation({
    onSuccess: () => {
      haptics.success();
      toast("Request received. Founder approval happens in the database/admin queue.");
      setEmail("");
    },
    onError: error => {
      haptics.warning();
      toast(error.message || "Could not submit access request.");
    },
  });

  return (
    <form
      className="mt-8 border border-[#2A2A2A] bg-[#090909]/92 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70"
      onSubmit={event => {
        event.preventDefault();
        haptics.submit();
        requestAccess.mutate({ email, source: "landing-load-gate" });
      }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#C8A96E]/70 text-[#C8A96E]">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <MicroLabel tone="gold">Need access?</MicroLabel>
          <p className="mt-2 text-sm font-bold leading-6 text-[#AFAFAF]">
            Drop your email. The founder approves it from the database/admin section before you join the challenge.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          required
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@email.com"
          className="min-h-12 border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]"
        />
        <SharpButton type="submit" disabled={requestAccess.isPending} className="min-w-40">
          {requestAccess.isPending ? "Sending" : "Request access"}
        </SharpButton>
      </div>
      <button
        type="button"
        onClick={() => { haptics.tap(); window.location.href = getLoginUrl(); }}
        className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#777] transition hover:text-[#C8A96E]"
      >
        Already approved? Log in.
      </button>
    </form>
  );
}

'''
if 'function SignupAccessForm()' not in home:
    home = home.replace('function Landing() {\n', signup_component + 'function Landing() {\n')

if '<SignupAccessForm />' not in home:
    home = home.replace('''            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <SharpButton onClick={() => (window.location.href = getLoginUrl())}>Start today’s log</SharpButton>
              <button className="min-h-12 border border-[#2A2A2A] bg-[#111] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C8A96E] hover:text-[#C8A96E]">
                See the rules
              </button>
            </div>''', '''            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <SharpButton onClick={() => { haptics.tap(); window.location.href = getLoginUrl(); }}>Start today’s log</SharpButton>
              <button onClick={() => haptics.tap()} className="min-h-12 border border-[#2A2A2A] bg-[#111] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C8A96E] hover:text-[#C8A96E]">
                See the rules
              </button>
            </div>
            <SignupAccessForm />''')

# Add admin signup approval mutations.
if 'const approveSignup = trpc.admin.approveSignup.useMutation' not in home:
    home = home.replace('''  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { toast("Payment marked received."); refetch(); } });
  const fulfill = trpc.admin.fulfillRedemption.useMutation({ onSuccess: () => { toast("Redemption marked fulfilled."); refetch(); } });''', '''  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { haptics.success(); toast("Payment marked received."); refetch(); } });
  const fulfill = trpc.admin.fulfillRedemption.useMutation({ onSuccess: () => { haptics.success(); toast("Redemption marked fulfilled."); refetch(); } });
  const approveSignup = trpc.admin.approveSignup.useMutation({ onSuccess: () => { haptics.success(); toast("Access request approved."); refetch(); } });
  const rejectSignup = trpc.admin.rejectSignup.useMutation({ onSuccess: () => { haptics.warning(); toast("Access request rejected."); refetch(); } });''')

admin_section = r'''      <section className="border border-[#2A2A2A] bg-[#101010] p-5 xl:col-span-2">
        <MicroLabel tone="gold">Access requests</MicroLabel>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Approve the gate.</h2>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#999]">
          Email-only requests land here and in the database. Approving marks the request as founder-cleared before the participant logs in.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(snapshot?.signupRequests ?? []).length === 0 && (
            <div className="border border-[#2A2A2A] bg-[#0D0D0D] p-4 text-sm font-bold text-[#777]">No access requests yet.</div>
          )}
          {(snapshot?.signupRequests ?? []).map((request: any) => (
            <div key={request.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-4 transition duration-300 hover:border-[#C8A96E]/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="break-all font-black uppercase text-white">{request.email}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">{request.source} · {new Date(request.createdAt).toLocaleString()}</p>
                </div>
                <span className={classNames("border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em]", request.status === "approved" ? "border-[#2ECC71] text-[#2ECC71]" : request.status === "rejected" ? "border-[#C0392B] text-[#C0392B]" : "border-[#C8A96E] text-[#C8A96E]")}>{request.status}</span>
              </div>
              {request.status === "pending" && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <SharpButton className="min-h-10 px-4 py-2" disabled={approveSignup.isPending} onClick={() => approveSignup.mutate({ requestId: request.id })}>Approve</SharpButton>
                  <button disabled={rejectSignup.isPending} className="min-h-10 border border-[#2A2A2A] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-50" onClick={() => rejectSignup.mutate({ requestId: request.id })}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
'''
if 'Approve the gate.' not in home:
    home = home.replace('''      <section className="border border-[#2A2A2A] bg-[#101010] p-5 xl:col-span-2">
        <MicroLabel tone="red">Warden and WhatsApp context</MicroLabel>''', admin_section + '''      <section className="border border-[#2A2A2A] bg-[#101010] p-5 xl:col-span-2">
        <MicroLabel tone="red">Warden and WhatsApp context</MicroLabel>''')

home_path.write_text(home)
