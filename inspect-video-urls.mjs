import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Parse MySQL connection string
  const url = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    port: parseInt(url.port) || 3306,
    ssl: url.searchParams.get('ssl') ? { rejectUnauthorized: false } : undefined
  });

  try {
    // Get all daily logs with video URLs
    const [logs] = await connection.query(
      "SELECT id, participantId, dayNumber, exerciseProofUrl FROM daily_logs WHERE exerciseProofUrl IS NOT NULL AND exerciseProofUrl LIKE '%\"type\":\"video\"%' LIMIT 10"
    );
    
    console.log(`Found ${logs.length} logs with video URLs\n`);
    
    for (const log of logs) {
      try {
        const proofMedia = JSON.parse(log.exerciseProofUrl);
        if (!Array.isArray(proofMedia)) continue;
        
        const videos = proofMedia.filter(item => item.type === 'video');
        if (videos.length === 0) continue;
        
        console.log(`Log ${log.id} (Day ${log.dayNumber}):`);
        videos.forEach((video, i) => {
          console.log(`  Video ${i + 1}:`);
          console.log(`    URL: ${video.url}`);
          console.log(`    MIME: ${video.mimeType}`);
          console.log(`    Name: ${video.name}`);
        });
        console.log();
      } catch (e) {
        // Not JSON, skip
      }
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
