import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const photoPath = "/home/ubuntu/upload/IMG_9151_tiny.jpeg";
const quote = "Time Time Time you have all of it but waste tonnes of it";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const connection = await mysql.createConnection(dbUrl);

  try {
    // Read the tiny compressed photo file
    const photoBuffer = fs.readFileSync(photoPath);
    const base64Photo = photoBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Photo}`;

    // Create proof media JSON
    const proofMedia = JSON.stringify([
      {
        url: dataUrl,
        type: "image",
        mimeType: "image/jpeg"
      }
    ]);

    // Senyo's participant ID
    const senyoId = 90001;

    // Insert Day 23 log with all required columns
    const now = new Date();
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - 1); // Yesterday
    
    const [result] = await connection.query(
      `INSERT INTO daily_logs 
       (participantId, dayNumber, logDate, noAlcohol, cleanEating, exerciseDone, exerciseDuration, exerciseProofUrl, reflectionDone, readTeachDone, readTeachText, trackedEverything, dayComplete, submittedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [senyoId, 23, logDate, true, true, true, 45, proofMedia, true, true, quote, true, true, now]
    );

    console.log("✅ Day 23 added successfully!");
    console.log(`Log ID: ${result.insertId}`);
    console.log(`Photo size: ${(photoBuffer.length / 1024).toFixed(2)}KB`);
  } finally {
    await connection.end();
  }
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
