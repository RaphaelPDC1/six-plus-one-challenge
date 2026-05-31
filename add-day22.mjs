import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const videoPath = "/home/ubuntu/upload/9DEC0C22-61BA-4DB9-B604-67F6F24ACA2C(1).mp4";
const quote = "You will only ever receive what you think you deserve. Things you want are infinite in supply, you are the block that needs addressing. If you subconsciously believe you are only deserved of a certain amount of income or a certain type of person, that's exactly what you'll get.";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connection = await mysql.createConnection(dbUrl);

  try {
    // Read the video file
    const videoBuffer = fs.readFileSync(videoPath);
    const base64Video = videoBuffer.toString("base64");
    const dataUrl = `data:video/mp4;base64,${base64Video}`;

    // Create proof media JSON
    const proofMedia = JSON.stringify([
      {
        url: dataUrl,
        type: "video",
        mimeType: "video/mp4"
      }
    ]);

    // Senyo's participant ID
    const ownerId = 90001;

    // Insert Day 22 log
    const now = new Date();
    const [result] = await connection.query(
      `INSERT INTO daily_logs 
       (participantId, dayNumber, exerciseDuration, exerciseProofUrl, cleanEatingMaintained, readTeachText, submittedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ownerId, 22, 45, proofMedia, true, quote, now]
    );

    console.log("✅ Day 22 added successfully!");
    console.log(`Log ID: ${result.insertId}`);
    console.log(`Participant ID: ${ownerId}`);
    console.log(`Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
