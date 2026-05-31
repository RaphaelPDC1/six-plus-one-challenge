import fs from "fs";
import mysql from "mysql2/promise";

const videoPath = "/home/ubuntu/upload/day22_compressed.mp4";
const quote = "You will only ever receive what you think you deserve. Things you want are infinite in supply, you are the block that needs addressing. If you subconsciously believe you are only deserved of a certain amount of income or a certain type of person, that's exactly what you'll get.";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connection = await mysql.createConnection(dbUrl);

  try {
    // Read the compressed video
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
    const senyoId = 90001;

    // Insert Day 22 log
    const now = new Date();
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - 2); // 2 days ago
    
    const [result] = await connection.query(
      `INSERT INTO daily_logs 
       (participantId, dayNumber, logDate, noAlcohol, cleanEating, exerciseDone, exerciseDuration, exerciseProofUrl, reflectionDone, readTeachDone, readTeachText, trackedEverything, dayComplete, submittedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [senyoId, 22, logDate, true, true, true, 45, proofMedia, true, true, quote, true, true, now]
    );

    console.log("✅ Day 22 added successfully!");
    console.log(`Log ID: ${result.insertId}`);
    console.log(`Video size: ${(videoBuffer.length / 1024).toFixed(2)}KB`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
