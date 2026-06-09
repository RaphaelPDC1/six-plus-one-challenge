import mysql from 'mysql2/promise';
import fs from 'fs';

const url = new URL(process.env.DATABASE_URL);

const imageB64 = fs.readFileSync('/tmp/image_b64.txt', 'utf-8');
const imageDataUrl = `data:image/jpeg;base64,${imageB64}`;

const proofData = JSON.stringify([
  {
    url: imageDataUrl,
    type: "image",
    mimeType: "image/jpeg"
  }
]);

const readTeachText = "No one can become conscious of the shadow without considerable moral effort. To become conscious of it involves recognizing the dark aspects of the personality as present and real.";

const connection = await mysql.createConnection({
  host: url.hostname,
  port: url.port || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

try {
  // Check if Day 33 already exists for G LODGE
  const [existing] = await connection.execute(
    `SELECT id FROM daily_logs WHERE participantId = ? AND dayNumber = ?`,
    [90002, 33]
  );
  
  if (existing.length > 0) {
    console.log(`⚠️ Day 33 already exists for G LODGE. Updating...`);
    const [result] = await connection.execute(
      `UPDATE daily_logs 
       SET noAlcohol = 1, cleanEating = 1, exerciseDone = 1, exerciseDuration = 45, 
           exerciseType = 'Gym', exerciseProofUrl = ?, readTeachDone = 1, readTeachText = ?,
           dayComplete = 1, pointsAwarded = 1, trackedEverything = 1
       WHERE participantId = ? AND dayNumber = ?`,
      [proofData, readTeachText, 90002, 33]
    );
    console.log(`✅ Day 33 updated for G LODGE`);
  } else {
    const [result] = await connection.execute(
      `INSERT INTO daily_logs 
       (participantId, dayNumber, noAlcohol, cleanEating, exerciseDone, exerciseDuration, 
        exerciseType, exerciseProofUrl, reflectionDone, readTeachDone, readTeachText, 
        dayComplete, pointsAwarded, trackedEverything)
       VALUES (?, ?, 1, 1, 1, 45, 'Gym', ?, 1, 1, ?, 1, 1, 1)`,
      [90002, 33, proofData, readTeachText]
    );
    console.log(`✅ Day 33 added for G LODGE (Log ID: ${result.insertId})`);
  }
  
} catch (error) {
  console.error('❌ Error adding Day 33:', error.message);
} finally {
  try {
    await connection.end();
  } catch (e) {
    // ignore
  }
}
