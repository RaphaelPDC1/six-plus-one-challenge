import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getChallengeState } from "../server/warden/challengeState";
import { runWardenCycle } from "../server/warden/runner";
import { shouldRunOrganicWardenCycle } from "../server/warden/organicScheduler";
import { getMessagesCountToday, getNoMessageCountToday } from "../server/warden/messageLogger";
import { ENV } from "../server/_core/env";

function safeJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, item) => {
      if (item instanceof Error) {
        return {
          name: item.name,
          message: item.message,
          stack: item.stack,
        };
      }
      if (item instanceof Date) return item.toISOString();
      return item;
    },
    2
  );
}

function missingDataSignals(state: Awaited<ReturnType<typeof getChallengeState>>): string[] {
  const missing: string[] = [];
  if (state.participants.length === 0) missing.push("No participants exist in the database.");
  if (state.recent_insights.length === 0) missing.push("No Read & Teach insight text was submitted today.");
  if (state.recent_reflections.length === 0) missing.push("No shared reflection text was submitted today.");
  if (state.exercise_logs.length === 0) missing.push("No exercise logs were submitted today.");
  if (state.recent_chat_messages.length === 0) missing.push("No WhatsApp chat messages were captured in the last 12 hours.");
  if (state.lives_lost_today.length === 0) missing.push("No life-loss payment events were recorded today.");
  if (state.milestones_hit_today.length === 0) missing.push("No challenge or streak milestones were detected today.");
  if (state.sharp_insights_shared_today.length === 0) missing.push("No long/sharp insight or reflection excerpts were detected today.");
  if (state.shared_themes.length === 0) missing.push("No cross-participant shared writing themes were detected today.");
  if (state.personal_bests_today.length === 0) missing.push("No personal bests were detected today.");
  if (state.silent_returns_today.length === 0) missing.push("No silent participant returns were detected today.");
  if (state.ghost_life_signals_today.length === 0) missing.push("No Ghost Life / Double-Down signals were detected today.");
  if (state.before_midday_full_rule_completions.length === 0) missing.push("No before-midday full six-rule completions were detected today.");
  return missing;
}

async function main() {
  const outDir = "/home/ubuntu/six-plus-one-challenge/warden-live-audit";
  mkdirSync(outDir, { recursive: true });

  const startedAt = new Date();
  const beforePostedCount = await getMessagesCountToday().catch((error) => ({ error }));
  const beforeNoMessageCount = await getNoMessageCountToday().catch((error) => ({ error }));
  const challengeState = await getChallengeState();
  const organicDecision = shouldRunOrganicWardenCycle(challengeState, startedAt);

  let runResult: Awaited<ReturnType<typeof runWardenCycle>> | null = null;
  let runError: unknown = null;

  try {
    runResult = await runWardenCycle();
  } catch (error) {
    runError = error;
  }

  const afterPostedCount = await getMessagesCountToday().catch((error) => ({ error }));
  const afterNoMessageCount = await getNoMessageCountToday().catch((error) => ({ error }));

  const postedCountChanged =
    typeof beforePostedCount === "number" &&
    typeof afterPostedCount === "number" &&
    afterPostedCount > beforePostedCount;

  const audit = {
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    env_status: {
      whapi_token_configured: Boolean(ENV.whapiToken),
      whapi_group_id_configured: Boolean(ENV.whapiGroupId),
      make_webhook_url_configured: Boolean(ENV.makeWebhookUrl),
    },
    pre_run_counts: {
      posted_messages_today: beforePostedCount,
      no_message_decisions_today: beforeNoMessageCount,
    },
    organic_decision_before_run: organicDecision,
    challenge_state: challengeState,
    run_result: runResult,
    run_error: runError,
    post_run_counts: {
      posted_messages_today: afterPostedCount,
      no_message_decisions_today: afterNoMessageCount,
    },
    whatsapp_post_diagnostic: {
      message_sent_flag: runResult?.messageSent ?? false,
      posted_count_increased: postedCountChanged,
      success_inferred: Boolean(runResult?.messageSent && !runError),
      note: "sendWardenMessage returns void; success is inferred from runWardenCycle.messageSent=true with no thrown Whapi error, plus postedToWhatsapp log count changes when available.",
    },
    no_message_or_skip_diagnostic: {
      message_generated: runResult?.messageGenerated ?? false,
      message: runResult?.message ?? null,
      reason: runResult?.reason ?? (runError ? "run_error" : null),
      daily_drama_score: challengeState.daily_drama_score,
      max_warden_messages_today: challengeState.max_warden_messages_today,
      drama_score_breakdown: challengeState.drama_score_breakdown,
      missing_data_signals: missingDataSignals(challengeState),
    },
  };

  writeFileSync(join(outDir, "live-warden-cycle-audit.json"), safeJson(audit));
  writeFileSync(join(outDir, "challenge-state.json"), safeJson(challengeState));

  const md = `# Live Warden Cycle Audit\n\nRun started at **${audit.started_at}** and completed at **${audit.completed_at}**.\n\n| Field | Value |\n|---|---|\n| Message generated | ${String(audit.run_result?.messageGenerated ?? false)} |\n| Message sent to WhatsApp | ${String(audit.run_result?.messageSent ?? false)} |\n| Run reason | ${audit.run_result?.reason ?? (audit.run_error ? "run_error" : "none")} |\n| Drama score | ${challengeState.daily_drama_score} |\n| Max Warden messages today | ${challengeState.max_warden_messages_today} |\n| Organic gate reason before run | ${organicDecision.reason} |\n| Organic window | ${organicDecision.windowId ?? "none"} |\n| Whapi token configured | ${String(audit.env_status.whapi_token_configured)} |\n| Whapi group configured | ${String(audit.env_status.whapi_group_id_configured)} |\n\n## Exact Message\n\n${audit.run_result?.message ? `> ${audit.run_result.message}` : "No message text was returned by runWardenCycle."}\n\n## Run Error\n\n\`\`\`json\n${safeJson(runError)}\n\`\`\`\n\n## Missing Data Signals\n\n${audit.no_message_or_skip_diagnostic.missing_data_signals.map((item) => `- ${item}`).join("\n") || "No missing-data signals detected."}\n\nSee \`live-warden-cycle-audit.json\` for the complete raw result and \`challenge-state.json\` for the full assembled CHALLENGE_STATE.\n`;
  writeFileSync(join(outDir, "live-warden-cycle-audit.md"), md);

  console.log(safeJson(audit));

  if (runError) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
