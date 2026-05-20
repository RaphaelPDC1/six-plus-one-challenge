import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get daily totals per participant
const [dailyRows] = await conn.execute(
  "SELECT participantId, SUM(pointsAwarded) AS dailyTotal FROM daily_logs WHERE dayComplete = 1 GROUP BY participantId"
);

// Get boost totals per userId
const [boostRows] = await conn.execute(
  "SELECT user_id, SUM(points_awarded) AS boostTotal FROM boost_wins GROUP BY user_id"
);

// Get participant id -> userId mapping
const [participants] = await conn.execute(
  "SELECT id, userId, displayName, totalPoints FROM participants"
);

const boostByUserId = {};
for (const b of boostRows) {
  boostByUserId[String(b.user_id)] = Number(b.boostTotal) || 0;
}

const dailyByParticipantId = {};
for (const d of dailyRows) {
  dailyByParticipantId[String(d.participantId)] = Number(d.dailyTotal) || 0;
}

console.log("\nRecalculating participant totalPoints...\n");
console.log("Name".padEnd(20), "Old".padEnd(8), "Daily".padEnd(8), "Boost".padEnd(8), "New");
console.log("-".repeat(60));

for (const p of participants) {
  const daily = dailyByParticipantId[String(p.id)] || 0;
  const boost = boostByUserId[String(p.userId)] || boostByUserId[String(p.id)] || 0;
  const newTotal = daily + boost;
  
  console.log(
    String(p.displayName).padEnd(20),
    String(p.totalPoints).padEnd(8),
    String(daily).padEnd(8),
    String(boost).padEnd(8),
    newTotal
  );
  
  await conn.execute(
    "UPDATE participants SET totalPoints = ? WHERE id = ?",
    [newTotal, p.id]
  );
}

console.log("\n✓ All participant totalPoints updated.\n");
await conn.end();
