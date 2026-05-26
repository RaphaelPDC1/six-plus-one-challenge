import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Parse MySQL connection string: mysql://user:pass@host:port/database?ssl=...
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
    // Get current stats
    const [current] = await connection.query(
      "SELECT id, displayName, lives, status, disputeReason FROM participants WHERE displayName IN ('Wiwi', 'Glodge', 'Kwabs', 'Nat')"
    );
    
    console.log('Current stats:');
    current.forEach(p => {
      console.log(`${p.displayName}: lives=${p.lives}, status=${p.status}, dispute=${p.disputeReason || 'none'}`);
    });
    
    // Update Wiwi: close dispute and deduct life
    await connection.query(
      "UPDATE participants SET lives = lives - 1, status = 'active', disputeReason = NULL WHERE displayName = 'Wiwi'"
    );
    console.log('✓ Wiwi: closed dispute, deducted 1 life');
    
    // Update Glodge, Kwabs, Nat: deduct 1 life each
    await connection.query(
      "UPDATE participants SET lives = lives - 1 WHERE displayName IN ('Glodge', 'Kwabs', 'Nat')"
    );
    console.log('✓ Glodge, Kwabs, Nat: deducted 1 life each');
    
    // Show updated stats
    const [updated] = await connection.query(
      "SELECT id, displayName, lives, status FROM participants WHERE displayName IN ('Wiwi', 'Glodge', 'Kwabs', 'Nat')"
    );
    
    console.log('\nUpdated stats:');
    updated.forEach(p => {
      console.log(`${p.displayName}: lives=${p.lives}, status=${p.status}`);
    });
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
