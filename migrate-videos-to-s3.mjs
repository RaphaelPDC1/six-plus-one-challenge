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
    // Get all daily logs with exerciseProofUrl
    const [logs] = await connection.query(
      "SELECT id, participantId, dayNumber, exerciseProofUrl FROM daily_logs WHERE exerciseProofUrl IS NOT NULL AND exerciseProofUrl != '' LIMIT 100"
    );
    
    console.log(`Found ${logs.length} logs with proof URLs`);
    
    let dataUrlCount = 0;
    let s3UrlCount = 0;
    
    for (const log of logs) {
      try {
        const proofMedia = JSON.parse(log.exerciseProofUrl);
        if (!Array.isArray(proofMedia)) continue;
        
        for (const item of proofMedia) {
          if (item.type === 'video') {
            if (item.url?.startsWith('data:')) {
              dataUrlCount++;
              console.log(`  Log ${log.id}: Found data URL video (${item.url.slice(0, 80)}...)`);
            } else if (item.url?.startsWith('/manus-storage/') || item.url?.startsWith('/api/storage-image/')) {
              s3UrlCount++;
            }
          }
        }
      } catch (e) {
        // Not JSON, skip
      }
    }
    
    console.log(`\nSummary:`);
    console.log(`  Data URL videos: ${dataUrlCount}`);
    console.log(`  S3 URL videos: ${s3UrlCount}`);
    console.log(`\nTo fix this, we need to:`);
    console.log(`  1. Extract base64 data from data URLs`);
    console.log(`  2. Upload to S3 using storagePut()`);
    console.log(`  3. Update database with S3 URLs`);
    console.log(`\nThis requires the server context. Consider running this as a tRPC procedure instead.`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
