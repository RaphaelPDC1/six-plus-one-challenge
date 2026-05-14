/**
 * Auto Release Note Publisher
 *
 * On every server startup, checks whether the current deployment (identified by
 * LAST_COMMIT_HASH) already has a release note in the DB.  If not, it calls the
 * LLM to generate a short, punchy community-care note and inserts it so the
 * popup appears automatically for all participants on their next visit.
 *
 * The LLM is given a brief description of what changed so the note is specific
 * rather than generic.  The description is stored in the RELEASE_NOTE_CONTEXT
 * env variable; if absent a sensible fallback is used.
 */

import { getDb } from "./db";
import { releaseNotes } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

interface GeneratedNote {
  title: string;
  summary: string;
  body: string;
}

async function generateReleaseNoteContent(context: string): Promise<GeneratedNote> {
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You write short, punchy in-app update notes for the "6+1 Four Lives Challenge" — a high-stakes 50-day fitness and discipline challenge. The tone is direct, motivating, and community-focused (like game patch notes). Keep it tight: no fluff, no filler. Write as if the Warden is speaking to the group.`,
      },
      {
        role: "user",
        content: `Write a community update note for the following changes. Return JSON only.

Changes in this update:
${context}

Return a JSON object with exactly these fields:
- "title": A short punchy headline (max 8 words, no period)
- "summary": One sentence summarising the key benefit to participants (max 20 words)
- "body": 2-4 sentences of detail — what changed and why it matters to the challenge. Be specific. No bullet points.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "release_note",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            body: { type: "string" },
          },
          required: ["title", "summary", "body"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = result.choices[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("LLM returned no content");
  return JSON.parse(raw) as GeneratedNote;
}

export async function autoPublishReleaseNoteIfNeeded(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AutoReleaseNote] DB unavailable — skipping auto release note.");
    return;
  }

  const versionLabel = ENV.deployCommitHash;

  // Check if a release note for this exact deployment already exists
  const existing = await db
    .select({ id: releaseNotes.id })
    .from(releaseNotes)
    .where(eq(releaseNotes.versionLabel, versionLabel))
    .limit(1);

  if (existing[0]) {
    console.log(`[AutoReleaseNote] Release note already exists for ${versionLabel} — skipping.`);
    return;
  }

  // In dev mode, skip LLM generation to avoid unnecessary API calls on every hot-reload
  if (!ENV.isProduction && versionLabel === "dev") {
    console.log("[AutoReleaseNote] Dev mode with no commit hash — skipping auto release note.");
    return;
  }

  // Retrieve the context for this deployment from env, or use a sensible fallback
  const context = (process.env.RELEASE_NOTE_CONTEXT ?? "").trim() ||
    "General improvements to app stability, proof uploads, and life-loss accuracy.";

  console.log(`[AutoReleaseNote] Generating release note for deployment ${versionLabel}…`);

  try {
    const note = await generateReleaseNoteContent(context);

    await db.insert(releaseNotes).values({
      title: note.title.trim().slice(0, 180),
      summary: note.summary.trim(),
      body: note.body.trim(),
      versionLabel,
      category: "community_care",
      active: true,
    });

    // Confirm insertion
    const created = await db
      .select({ id: releaseNotes.id, title: releaseNotes.title })
      .from(releaseNotes)
      .orderBy(desc(releaseNotes.createdAt))
      .limit(1);

    console.log(`[AutoReleaseNote] ✓ Published: "${created[0]?.title}" (id ${created[0]?.id}) for ${versionLabel}`);
  } catch (err) {
    // Non-fatal — the app still works without the release note
    console.error("[AutoReleaseNote] Failed to generate/publish release note:", err);
  }
}
