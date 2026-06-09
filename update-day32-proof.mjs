import mysql from 'mysql2/promise';
import fs from 'fs';

const url = new URL(process.env.DATABASE_URL);

const videoB64 = fs.readFileSync('/tmp/video_b64_tiny.txt', 'utf-8');
const videoDataUrl = `data:video/mp4;base64,${videoB64}`;

const proofData = JSON.stringify([
  {
    url: videoDataUrl,
    type: "video",
    mimeType: "video/mp4"
  }
]);

const connection = await mysql.createConnection({
  host: url.hostname,
  port: url.port || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
});

try {
  // Update Day 32 proof for Senyo (participant_id 90001)
  const [result] = await connection.execute(
    `UPDATE daily_logs 
     SET exerciseProofUrl = ?
     WHERE participantId = ? AND dayNumber = ?`,
    [proofData, 90001, 32]
  );
  
  if (result.affectedRows > 0) {
    console.log(`✅ Day 32 proof updated for Senyo`);
  } else {
    console.log(`⚠️ No rows updated. Checking if Day 32 exists...`);
  }
  console.log(`Rows affected: ${result.affectedRows}`);
  
} catch (error) {
  console.error('❌ Error updating Day 32:', error.message);
  console.error('Full error:', error);
} finally {
  try {
    await connection.end();
  } catch (e) {
    // ignore
  }
}
