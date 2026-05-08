import { invokeLLM } from "./_core/llm";

type Snapshot = Record<string, any>;

type DeepThoughtItem = {
  logId: number;
  participantId: number;
  insight: string;
  source: "ai" | "fallback";
  fingerprint: string;
};

type DeepThoughtContext = {
  logId: number;
  participantId: number;
  displayName: string;
  firstName: string;
  dayNumber: number;
  proof: {
    readTeachText: string;
    exerciseType: string;
    exerciseDuration: number;
    proofMediaCount: number;
    proofMediaTypes: string[];
    completedRules: number;
  };
  participantSignals: {
    primaryGoal: string;
    trainingLevel: string;
    livesRemaining: number;
    currentStreak: number;
    daysComplete: number;
    obstacleSignal: string;
    supportSignal: string;
  };
  recentPattern: {
    logsSeen: number;
    proofDays: number;
    greenDays: number;
    averageCompletedRules: number;
    recentReadTeachThemes: string[];
    privateReflectionSignal: string;
  };
  requestedSequence: string[];
};

type DeepThoughtCacheEntry = {
  fingerprint: string;
  item: DeepThoughtItem;
  createdAt: number;
};

const deepThoughtCache = new Map<string, DeepThoughtCacheEntry>();
const DEEP_THOUGHT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export function clearDeepThoughtCacheForTests() {
  deepThoughtCache.clear();
}

function stableStringify(value: unknown): string {
  const normalize = (input: any): any => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      return Object.keys(input).sort().reduce((acc: Record<string, any>, key) => {
        acc[key] = normalize(input[key]);
        return acc;
      }, {});
    }
    return input;
  };
  return JSON.stringify(normalize(value));
}

function compactText(value: unknown, max = 700) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function firstNameOf(value: unknown) {
  const name = compactText(value, 80) || "Participant";
  return name.split(/\s+/)[0] || "Participant";
}

function parseProofMediaSummary(value: unknown) {
  const raw = compactText(value, 12000);
  if (!raw) return { proofMediaCount: 0, proofMediaTypes: [] as string[] };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const types = parsed
        .map(item => compactText((item as any)?.type || (item as any)?.mimeType || "proof", 30).toLowerCase())
        .filter(Boolean)
        .slice(0, 6);
      return { proofMediaCount: types.length, proofMediaTypes: types };
    }
  } catch {
    // Older logs may store a single proof note or URL.
  }
  return { proofMediaCount: 1, proofMediaTypes: [raw.match(/\.(mp4|mov|webm)(\?|#|$)/i) ? "video" : raw.match(/\.(png|jpe?g|webp)(\?|#|$)/i) ? "image" : "proof-note"] };
}

function completedRuleCount(log: Record<string, any> | null | undefined) {
  if (!log) return 0;
  return [
    Boolean(log.noAlcohol),
    Boolean(log.cleanEating),
    Boolean(log.exerciseDone) || (Number(log.exerciseDuration ?? 0) >= 30 && compactText(log.exerciseType).length > 0),
    Boolean(log.reflectionDone) || compactText(log.reflectionText).length > 0,
    Boolean(log.readTeachDone) || compactText(log.readTeachText).length > 0,
    Boolean(log.trackedEverything),
  ].filter(Boolean).length;
}

function classifySignal(text: string, fallback: string) {
  const lower = text.toLowerCase();
  if (!lower) return fallback;
  if (/time|busy|work|shift|travel|schedule/.test(lower)) return "time pressure";
  if (/social|weekend|drink|alcohol|night|mate|friends/.test(lower)) return "social pressure";
  if (/stress|tired|energy|mental|motivation|overwhelm/.test(lower)) return "energy and headspace";
  if (/food|eat|diet|craving|snack/.test(lower)) return "food environment";
  if (/injur|pain|fitness|run|gym|strength/.test(lower)) return "training friction";
  return fallback;
}

function extractThemes(logs: Record<string, any>[]) {
  return logs
    .map(log => compactText(log.readTeachText, 120))
    .filter(Boolean)
    .slice(0, 4);
}

function inferTeachingMeaning(text: string) {
  const lower = text.toLowerCase();
  if (!lower) return "the standard has to be proved in action, not explained afterwards";
  if (/excuse|blame|fault|responsib|accountab|own/.test(lower)) return "accountability is shifting from explanation to ownership";
  if (/discipline|standard|habit|routine|consisten|daily|repeat/.test(lower)) return "discipline is becoming a repeated standard rather than a one-off mood";
  if (/comfort|hard|pain|struggle|resilien|suffer|pressure|friction|chafe|awkward|irritation|rub|rubbing|sore/.test(lower)) return "the uncomfortable part is being treated as the training, not the interruption";
  if (/patien|slow|process|progress|compound|small/.test(lower)) return "small actions are being trusted before the result is visible";
  if (/focus|attention|present|control|choice|decision/.test(lower)) return "control is moving back to the next decision instead of the whole day at once";
  if (/fear|doubt|confidence|identity|become|person/.test(lower)) return "identity is being rebuilt through evidence rather than self-talk";
  if (/food|eat|clean|craving|nutrition|diet/.test(lower)) return "the food choice is becoming a boundary instead of a negotiation";
  if (/learn|teach|read|quote|book|knowledge/.test(lower)) return "the lesson is only counting because it is being tested against the day";
  return "the useful part is not the sentence itself, but whether it changes the next ordinary choice";
}

function meaningfulWords(text: string) {
  const stop = new Set(["the", "and", "that", "this", "with", "from", "your", "you", "are", "was", "were", "have", "has", "had", "into", "they", "them", "for", "but", "not", "what", "when", "where", "why", "how", "its", "it's", "their", "there", "then", "than", "today", "quote"]);
  return compactText(text, 900)
    .toLowerCase()
    .replace(/[“”'\".,!?;:()\[\]{}]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 4 && !stop.has(word));
}

function repeatsSourceTooClosely(insight: string, source: string) {
  const sourceText = compactText(source, 900);
  const output = compactText(insight, 900).toLowerCase();
  if (!sourceText || !output) return false;
  const sourceLower = sourceText.toLowerCase();
  const sourceSentences = sourceLower.split(/[.!?;:\n]/).map(part => compactText(part, 160).toLowerCase()).filter(part => part.length >= 28);
  if (sourceSentences.some(sentence => output.includes(sentence))) return true;
  const words = Array.from(new Set(meaningfulWords(sourceText)));
  if (words.length < 5) return false;
  const repeated = words.filter(word => output.includes(word)).length;
  return repeated / words.length >= 0.58;
}

function reflectionSignal(logs: Record<string, any>[]) {
  const privateText = logs.map(log => compactText(log.reflectionText, 220).toLowerCase()).join(" ");
  if (!privateText) return "no private reflection pattern used";
  if (/stress|tired|hard|struggle|tempt|nearly|busy|pressure|embarrass|awkward|friction/.test(privateText)) return "private reflections show pressure being named rather than hidden";
  if (/proud|better|learn|realise|noticed|honest|grateful/.test(privateText)) return "private reflections show self-awareness building";
  return "private reflections show the person is paying attention to the day";
}

export function buildDeepThoughtContext(participant: Record<string, any>, log: Record<string, any>, allLogs: Record<string, any>[]): DeepThoughtContext {
  const participantId = Number(log.participantId ?? participant?.id ?? 0);
  const ownLogs = allLogs
    .filter(entry => Number(entry?.participantId ?? 0) === participantId)
    .sort((a, b) => Number(b.dayNumber ?? 0) - Number(a.dayNumber ?? 0))
    .slice(0, 8);
  const recentCompleted = ownLogs.map(completedRuleCount);
  const proofMedia = parseProofMediaSummary(log.exerciseProofUrl);
  const displayName = compactText(participant?.displayName, 80) || "Participant";
  const obstacleText = compactText(participant?.biggestObstacle, 400);
  const supportText = compactText(participant?.supportNeeded, 400);
  return {
    logId: Number(log.id ?? 0),
    participantId,
    displayName,
    firstName: firstNameOf(displayName),
    dayNumber: Number(log.dayNumber ?? 0),
    proof: {
      readTeachText: compactText(log.readTeachText, 900),
      exerciseType: compactText(log.exerciseType, 120),
      exerciseDuration: Number(log.exerciseDuration ?? 0),
      proofMediaCount: proofMedia.proofMediaCount,
      proofMediaTypes: proofMedia.proofMediaTypes,
      completedRules: completedRuleCount(log),
    },
    participantSignals: {
      primaryGoal: compactText(participant?.primaryGoal, 180),
      trainingLevel: compactText(participant?.trainingLevel, 80),
      livesRemaining: Number(participant?.livesRemaining ?? 4),
      currentStreak: Number(participant?.currentStreak ?? 0),
      daysComplete: Number(participant?.daysComplete ?? 0),
      obstacleSignal: classifySignal(obstacleText, obstacleText ? "named personal friction" : "no stated friction"),
      supportSignal: classifySignal(supportText, supportText ? "support requested" : "no support request"),
    },
    recentPattern: {
      logsSeen: ownLogs.length,
      proofDays: ownLogs.filter(entry => parseProofMediaSummary(entry.exerciseProofUrl).proofMediaCount > 0).length,
      greenDays: ownLogs.filter(entry => Boolean(entry.dayComplete) || completedRuleCount(entry) >= 5).length,
      averageCompletedRules: recentCompleted.length ? Math.round((recentCompleted.reduce((sum, count) => sum + count, 0) / recentCompleted.length) * 10) / 10 : 0,
      recentReadTeachThemes: extractThemes(ownLogs),
      privateReflectionSignal: reflectionSignal(ownLogs),
    },
    requestedSequence: [
      "Read the public proof and Read & Teach text first.",
      "Compare it with the participant's safe challenge signals and recent pattern.",
      "Infer one specific tension, choice, or identity shift behind this post.",
      "Write one public-safe insight that connects to the proof without exposing private reflections or internal reasoning.",
    ],
  };
}

export function fallbackDeepThought(context: DeepThoughtContext): string {
  const name = context.firstName;
  const proofText = context.proof.readTeachText;
  const exercise = context.proof.exerciseDuration > 0
    ? `${context.proof.exerciseDuration} minutes${context.proof.exerciseType ? ` of ${context.proof.exerciseType.toLowerCase()}` : ""}`
    : context.proof.proofMediaCount > 0
      ? "visible proof"
      : "today's entry";
  const pressure = context.participantSignals.obstacleSignal !== "no stated friction" ? context.participantSignals.obstacleSignal : context.participantSignals.supportSignal;
  if (proofText.length > 0) {
    const meaning = inferTeachingMeaning(proofText);
    return `${name}, the value is not in repeating the line — it is in what the post proves after it. ${meaning}, and ${exercise} makes that lesson visible in the part of the day where ${pressure} usually gets a vote.`;
  }
  if (context.recentPattern.proofDays >= 3) {
    return `${name}, this is starting to look less like a good day and more like a pattern. ${exercise} is another receipt that the identity is being built before anyone claps for it.`;
  }
  return `${name}, the proof matters because it makes the standard visible. The next step is to make tomorrow’s first decision just as hard to argue with.`;
}

function sanitizeInsight(value: unknown, context: DeepThoughtContext) {
  const text = compactText(value, 520)
    .replace(/^['"“”]+|['"“”]+$/g, "")
    .replace(/\b(reflectionText|readTeachText|exerciseProofUrl|JSON|field name|prompt|system)\b/gi, "")
    .trim();
  if (text.length < 45) return null;
  if (repeatsSourceTooClosely(text, context.proof.readTeachText)) return null;
  if (!new RegExp(`\\b${context.firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
    return `${context.firstName}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`.slice(0, 520);
  }
  return text.slice(0, 520);
}

function cacheKeyFor(context: DeepThoughtContext) {
  return `${context.participantId}:${context.logId}:${context.dayNumber}`;
}

function fingerprintFor(context: DeepThoughtContext) {
  return stableStringify(context);
}

function getCachedDeepThought(context: DeepThoughtContext) {
  const cacheKey = cacheKeyFor(context);
  const fingerprint = fingerprintFor(context);
  const cached = deepThoughtCache.get(cacheKey);
  if (!cached) return null;
  if (cached.fingerprint !== fingerprint) return null;
  if (Date.now() - cached.createdAt > DEEP_THOUGHT_CACHE_TTL_MS) return null;
  return cached.item;
}

function rememberDeepThought(context: DeepThoughtContext, source: "ai" | "fallback", insight: string): DeepThoughtItem {
  const item = { logId: context.logId, participantId: context.participantId, insight, source, fingerprint: fingerprintFor(context) };
  deepThoughtCache.set(cacheKeyFor(context), { fingerprint: item.fingerprint, item, createdAt: Date.now() });
  return item;
}

async function generateAiDeepThoughts(contexts: DeepThoughtContext[]) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are the Deep Thought engine for the 6+1 Four Lives Challenge. For each proof card, privately follow the provided sequence and output one public-safe insight. The result must feel personal, intelligent, direct, and slightly surprising. Interpret the meaning behind the participant's submitted quote or Read & Teach text, then connect that interpretation to the proof, exercise, completion signals, and recent pattern. Do not repeat, quote, or closely paraphrase the submitted quote; add the layer underneath it. Do not expose internal reasoning. Do not quote private reflections. Do not invent image contents. Do not write generic motivation. Write as if you noticed the specific choice behind the post and can explain why it matters.",
      },
      {
        role: "user",
        content: JSON.stringify({ contexts }, null, 2),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "deep_thought_batch",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  logId: { type: "number" },
                  insight: { type: "string" },
                },
                required: ["logId", "insight"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : null;
  if (!parsed || !Array.isArray(parsed.items)) throw new Error("Deep Thought AI returned an invalid batch.");
  return parsed.items as Array<{ logId: number; insight: string }>;
}

export async function generateDeepThoughtsForSnapshot(snapshot: Snapshot, requestedLogIds: number[]): Promise<Record<string, DeepThoughtItem>> {
  const participants = Array.isArray(snapshot.participants) ? snapshot.participants : [];
  const logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
  const requested = new Set(requestedLogIds.map(Number).filter(Number.isFinite));
  const visibleLogs = logs
    .filter((log: any) => requested.size === 0 || requested.has(Number(log.id ?? 0)))
    .filter((log: any) => compactText(log.readTeachText).length > 0 || parseProofMediaSummary(log.exerciseProofUrl).proofMediaCount > 0)
    .slice(0, 12);
  const contexts = visibleLogs.map((log: any) => buildDeepThoughtContext(participants.find((p: any) => Number(p.id ?? 0) === Number(log.participantId ?? 0)) ?? {}, log, logs));
  const result: Record<string, DeepThoughtItem> = {};
  const missing: DeepThoughtContext[] = [];
  for (const context of contexts) {
    const cached = getCachedDeepThought(context);
    if (cached) result[String(context.logId)] = cached;
    else missing.push(context);
  }
  if (missing.length > 0) {
    try {
      const aiItems = await generateAiDeepThoughts(missing);
      const aiByLogId = new Map(aiItems.map(item => [Number(item.logId), item.insight]));
      for (const context of missing) {
        const sanitized = sanitizeInsight(aiByLogId.get(context.logId), context);
        if (sanitized) {
          result[String(context.logId)] = rememberDeepThought(context, "ai", sanitized);
        } else {
          result[String(context.logId)] = rememberDeepThought(context, "fallback", fallbackDeepThought(context));
        }
      }
    } catch (error) {
      console.warn("[DeepThought] Falling back after AI generation failed", error);
      for (const context of missing) {
        result[String(context.logId)] = rememberDeepThought(context, "fallback", fallbackDeepThought(context));
      }
    }
  }
  return result;
}
