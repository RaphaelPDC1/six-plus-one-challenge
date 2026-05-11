/**
 * Server-side script to send a community care release note about the Points in Play fix
 * Run with: npx ts-node send-points-notification.ts
 */

import { db } from "./server/db";

async function sendNotification() {
  try {
    console.log("📤 Creating Points in Play notification for all participants...");

    const releaseNote = await db.query.releaseNotes.findFirst({
      where: (notes, { eq }) => eq(notes.title, "Points in Play Now Includes All Bonuses"),
    });

    if (releaseNote) {
      console.log("⚠️  Notification already exists with ID:", releaseNote.id);
      console.log("Skipping duplicate creation.");
      return;
    }

    // Create the release note
    const result = await db.insert(db.schema.releaseNotes).values({
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
    });

    console.log("✅ Notification created successfully!");
    console.log("Release Note ID:", result[0]?.insertId);
    console.log("\nAll participants will see this notification when they next open the app.");
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    process.exit(1);
  }
}

sendNotification();
