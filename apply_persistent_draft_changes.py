from pathlib import Path

root = Path('/home/ubuntu/six-plus-one-challenge')

def replace_once(path: Path, find: str, replace: str) -> None:
    source = path.read_text()
    if find not in source:
        raise RuntimeError(f'Pattern not found in {path}: {find[:120]!r}')
    path.write_text(source.replace(find, replace, 1))

cookies_path = root / 'server/_core/cookies.ts'
replace_once(
    cookies_path,
    'import type { CookieOptions, Request } from "express";\n',
    'import type { CookieOptions, Request } from "express";\nimport { ONE_YEAR_MS } from "@shared/const";\n',
)
replace_once(
    cookies_path,
    '): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {',
    '): Pick<CookieOptions, "domain" | "httpOnly" | "maxAge" | "path" | "sameSite" | "secure"> {',
)
replace_once(
    cookies_path,
    '    httpOnly: true,\n    path: "/",\n',
    '    httpOnly: true,\n    maxAge: ONE_YEAR_MS / 1000,\n    path: "/",\n',
)

home_path = root / 'client/src/pages/Home.tsx'
replace_once(
    home_path,
    '''const emptyDay: MyDayForm = {\n  noAlcohol: false,\n  cleanEating: false,\n  cleanEatingNote: "",\n  exerciseDuration: 0,\n  exerciseType: "",\n  exerciseProofUrl: "",\n  reflectionText: "",\n  reflectionShared: false,\n  readTeachText: "",\n  trackedEverything: false,\n};\n''',
    '''const emptyDay: MyDayForm = {\n  noAlcohol: false,\n  cleanEating: false,\n  cleanEatingNote: "",\n  exerciseDuration: 0,\n  exerciseType: "",\n  exerciseProofUrl: "",\n  reflectionText: "",\n  reflectionShared: false,\n  readTeachText: "",\n  trackedEverything: false,\n};\n\nconst DRAFT_STORAGE_PREFIX = "draft_6plus1";\n\nfunction getDraftStorageKey(userId: string | number | undefined, dayNumber: number | undefined) {\n  if (!userId || !dayNumber) return "";\n  return `${DRAFT_STORAGE_PREFIX}_${userId}_day${dayNumber}`;\n}\n\nfunction dailyLogToForm(log: Partial<MyDayForm> | null | undefined): MyDayForm {\n  if (!log) return emptyDay;\n  return {\n    noAlcohol: Boolean(log.noAlcohol),\n    cleanEating: Boolean(log.cleanEating),\n    cleanEatingNote: String(log.cleanEatingNote ?? ""),\n    exerciseDuration: Number(log.exerciseDuration ?? 0),\n    exerciseType: String(log.exerciseType ?? ""),\n    exerciseProofUrl: String(log.exerciseProofUrl ?? ""),\n    reflectionText: String(log.reflectionText ?? ""),\n    reflectionShared: Boolean(log.reflectionShared),\n    readTeachText: String(log.readTeachText ?? ""),\n    trackedEverything: Boolean(log.trackedEverything),\n  };\n}\n\nfunction hasDraftContent(draft: MyDayForm) {\n  return draft.noAlcohol || draft.cleanEating || draft.cleanEatingNote.trim().length > 0 || draft.exerciseDuration > 0 || draft.exerciseType.trim().length > 0 || draft.exerciseProofUrl.trim().length > 0 || draft.reflectionText.trim().length > 0 || draft.reflectionShared || draft.readTeachText.trim().length > 0 || draft.trackedEverything;\n}\n\nfunction readStoredDraft(storageKey: string): MyDayForm | null {\n  if (typeof window === "undefined" || !storageKey) return null;\n  try {\n    const raw = window.localStorage.getItem(storageKey);\n    if (!raw) return null;\n    const parsed = JSON.parse(raw) as { form?: Partial<MyDayForm> } | Partial<MyDayForm>;\n    const restored = dailyLogToForm("form" in parsed ? parsed.form : parsed);\n    return hasDraftContent(restored) ? restored : null;\n  } catch {\n    return null;\n  }\n}\n''',
)
replace_once(
    home_path,
    '''  const [saveNotice, setSaveNotice] = useState<{ title: string; complete: boolean } | null>(null);\n  const cameraProofInputRef = useRef<HTMLInputElement | null>(null);\n  const libraryProofInputRef = useRef<HTMLInputElement | null>(null);\n  const participant = snapshot?.participant;\n  const latestWarden = [...(snapshot?.wardenMessages ?? [])].reverse()[0];\n  const { rules, completedRules, allAddressed } = getDailyLogProgress(form);\n  const ghostLifeLocked = Boolean(participant?.ghostLifeUsed);\n''',
    '''  const [saveNotice, setSaveNotice] = useState<{ title: string; complete: boolean } | null>(null);\n  const [draftRestored, setDraftRestored] = useState(false);\n  const [draftReady, setDraftReady] = useState(false);\n  const cameraProofInputRef = useRef<HTMLInputElement | null>(null);\n  const libraryProofInputRef = useRef<HTMLInputElement | null>(null);\n  const participant = snapshot?.participant;\n  const currentDayNumber = snapshot?.challenge?.currentDay ?? 1;\n  const draftStorageKey = getDraftStorageKey(participant?.userId ?? participant?.id, currentDayNumber);\n  const latestWarden = [...(snapshot?.wardenMessages ?? [])].reverse()[0];\n  const { rules, completedRules, allAddressed } = getDailyLogProgress(form);\n  const ghostLifeLocked = Boolean(participant?.ghostLifeUsed);\n\n  useEffect(() => {\n    setDraftReady(false);\n    setDraftRestored(false);\n    if (!draftStorageKey) {\n      setForm(emptyDay);\n      return;\n    }\n\n    const storedDraft = readStoredDraft(draftStorageKey);\n    if (storedDraft) {\n      setForm(storedDraft);\n      setDraftRestored(true);\n      window.setTimeout(() => setDraftRestored(false), 2600);\n      setDraftReady(true);\n      return;\n    }\n\n    setForm(dailyLogToForm(snapshot?.myLog));\n    setDraftReady(true);\n  }, [draftStorageKey, snapshot?.myLog]);\n\n  useEffect(() => {\n    if (typeof window === "undefined" || !draftReady || !draftStorageKey) return;\n    const timeout = window.setTimeout(() => {\n      if (hasDraftContent(form)) {\n        window.localStorage.setItem(draftStorageKey, JSON.stringify({ savedAt: Date.now(), form }));\n      } else {\n        window.localStorage.removeItem(draftStorageKey);\n      }\n    }, 800);\n    return () => window.clearTimeout(timeout);\n  }, [draftReady, draftStorageKey, form]);\n''',
)
replace_once(
    home_path,
    '''      window.setTimeout(() => setSaveNotice(null), 2200);\n      refetch();\n''',
    '''      if (draftStorageKey && typeof window !== "undefined") {\n        window.localStorage.removeItem(draftStorageKey);\n      }\n      window.setTimeout(() => setSaveNotice(null), 2200);\n      refetch();\n''',
)
replace_once(
    home_path,
    '''          {saveNotice && (\n            <div className={classNames("pointer-events-none absolute right-3 top-3 border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-2xl", saveNotice.complete ? "border-[#2ECC71] bg-[#0F2A18] text-[#2ECC71]" : "border-[#C8A96E] bg-[#16130B] text-[#C8A96E]")}>\n              {saveNotice.title}\n            </div>\n          )}\n''',
    '''          {saveNotice && (\n            <div className={classNames("pointer-events-none absolute right-3 top-3 border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-2xl", saveNotice.complete ? "border-[#2ECC71] bg-[#0F2A18] text-[#2ECC71]" : "border-[#C8A96E] bg-[#16130B] text-[#C8A96E]")}>\n              {saveNotice.title}\n            </div>\n          )}\n          {draftRestored && (\n            <div className="pointer-events-none absolute left-3 top-3 border border-[#C8A96E]/70 bg-[#16130B] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E] shadow-2xl">\n              Draft restored\n            </div>\n          )}\n''',
)

test_path = root / 'client/src/pages/Home.onboarding.test.tsx'
replace_once(
    test_path,
    '''  it("uses a compact flick-card calendar with an expandable full journey view", () => {\n    const calendarSource = readFileSync(new URL("./Calendar.tsx", import.meta.url), "utf8");\n\n    expect(calendarSource).toContain("Flick calendar");\n    expect(calendarSource).toContain("Expand full calendar");\n    expect(calendarSource).toContain("Hide full calendar");\n    expect(calendarSource).toContain("setExpanded(value => !value)");\n    expect(calendarSource).toContain("full journey map");\n  });\n''',
    '''  it("uses persistent cookies and local daily draft recovery for returning participants", () => {\n    const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");\n    const cookieSource = readFileSync(new URL("../../../server/_core/cookies.ts", import.meta.url), "utf8");\n\n    expect(cookieSource).toContain('import { ONE_YEAR_MS } from "@shared/const";');\n    expect(cookieSource).toContain("maxAge: ONE_YEAR_MS / 1000");\n    expect(homeSource).toContain('const DRAFT_STORAGE_PREFIX = "draft_6plus1";');\n    expect(homeSource).toContain('`${DRAFT_STORAGE_PREFIX}_${userId}_day${dayNumber}`');\n    expect(homeSource).toContain("window.localStorage.setItem(draftStorageKey");\n    expect(homeSource).toContain("window.localStorage.removeItem(draftStorageKey);");\n    expect(homeSource).toContain("Draft restored");\n    expect(homeSource).toContain("setForm(dailyLogToForm(snapshot?.myLog));");\n  });\n\n  it("uses a compact flick-card calendar with an expandable full journey view", () => {\n    const calendarSource = readFileSync(new URL("./Calendar.tsx", import.meta.url), "utf8");\n\n    expect(calendarSource).toContain("Flick calendar");\n    expect(calendarSource).toContain("Expand full calendar");\n    expect(calendarSource).toContain("Hide full calendar");\n    expect(calendarSource).toContain("setExpanded(value => !value)");\n    expect(calendarSource).toContain("full journey map");\n  });\n''',
)
