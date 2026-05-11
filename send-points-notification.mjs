#!/usr/bin/env node

/**
 * Script to send a community care release note about the Points in Play fix
 * This notifies all participants about the scoring accuracy improvement
 */

const API_URL = process.env.VITE_FRONTEND_FORGE_API_URL || "https://api.manus.im";
const API_KEY = process.env.VITE_FRONTEND_FORGE_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing API key. Set VITE_FRONTEND_FORGE_API_KEY or BUILT_IN_FORGE_API_KEY");
  process.exit(1);
}

const releaseNote = {
  title: "Points in Play Now Includes All Bonuses",
  summary: "Your Points in Play display now shows your complete total including all boost bonuses earned. The leaderboard total and My Day screen are now perfectly aligned.",
  body: `We've fixed a display issue where the "Points in Play" metric on your My Day screen wasn't showing boost bonuses you'd already earned.

**What Changed:**
Your Points in Play now includes:
• Base points from completed daily logs
• Today's live task points (rules, proof, insight)
• All boost bonuses earned on previous days

**Why This Matters:**
This ensures complete transparency about your score. The number you see on My Day now matches exactly what determines your rank on the Board.

**No Action Needed:**
This is a display fix only. Your actual score and leaderboard position remain unchanged—we just made sure you can see the full picture.

Thanks for your commitment to the challenge. Keep pushing! 💪`,
  versionLabel: "2026.05.11",
  category: "community_care",
  active: true,
};

async function sendNotification() {
  try {
    console.log("📤 Sending Points in Play notification to all participants...");
    console.log("Title:", releaseNote.title);
    console.log("Category:", releaseNote.category);

    const response = await fetch(`${API_URL}/api/trpc/system.createReleaseNote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        input: releaseNote,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to send notification");
      console.error("Status:", response.status);
      console.error("Response:", errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log("✅ Notification sent successfully!");
    console.log("Release Note ID:", result.result?.data?.id);
    console.log("\nAll participants will see this notification when they next open the app.");
  } catch (error) {
    console.error("❌ Error sending notification:", error.message);
    process.exit(1);
  }
}

sendNotification();
