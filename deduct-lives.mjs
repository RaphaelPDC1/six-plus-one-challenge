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
    const names = ['Wiwi', 'Glodge', 'Kwabs', 'Nat'];
    
    for (const name of names) {
      // Get current lives
      const [result] = await connection.query(
        "SELECT id, displayName, livesRemaining FROM participants WHERE displayName = ?",
        [name]
      );
      
      if (result.length === 0) {
        console.log(`❌ ${name}: Not found`);
        continue;
      }
      
      const participant = result[0];
      const newLives = Math.max(0, participant.livesRemaining - 1);
      
      // Update lives
      await connection.query(
        "UPDATE participants SET livesRemaining = ? WHERE id = ?",
        [newLives, participant.id]
      );
      
      console.log(`✅ ${name}: ${participant.livesRemaining} → ${newLives} lives`);
    }
    
    // For Wiwi, also close the dispute
    const [wiwi] = await connection.query(
      "SELECT id, status FROM participants WHERE displayName = 'Wiwi'"
    );
    
    if (wiwi.length > 0) {
      const wasDispute = wiwi[0].status === 'dispute';
      await connection.query(
        "UPDATE participants SET status = 'active', disputeReason = NULL WHERE id = ?",
        [wiwi[0].id]
      );
      if (wasDispute) {
        console.log(`✅ Wiwi: Dispute closed, status set to active`);
      }
    }
    
    console.log('\n✅ All life deductions complete!');
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
