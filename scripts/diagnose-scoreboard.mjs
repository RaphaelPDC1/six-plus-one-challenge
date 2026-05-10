import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);
try {
  const [summaryRows] = await conn.execute(`
    SELECT
      p.id,
      p.displayName,
      p.totalPoints AS storedPoints,
      p.daysComplete AS storedDays,
      COALESCE(SUM(CASE WHEN dl.dayComplete = 1 THEN dl.pointsAwarded ELSE 0 END), 0) AS logPoints,
      COALESCE(SUM(CASE WHEN dl.dayComplete = 1 THEN 1 ELSE 0 END), 0) AS completeLogDays,
      COALESCE(b.boostPoints, 0) AS boostPoints,
      COALESCE(SUM(CASE WHEN dl.dayComplete = 1 THEN dl.pointsAwarded ELSE 0 END), 0) + COALESCE(b.boostPoints, 0) AS canonicalPoints,
      p.totalPoints - COALESCE(SUM(CASE WHEN dl.dayComplete = 1 THEN dl.pointsAwarded ELSE 0 END), 0) AS storedMinusLogPoints,
      p.daysComplete - COALESCE(SUM(CASE WHEN dl.dayComplete = 1 THEN 1 ELSE 0 END), 0) AS storedMinusCompleteDays
    FROM participants p
    LEFT JOIN daily_logs dl ON dl.participantId = p.id
    LEFT JOIN (
      SELECT user_id, SUM(points_awarded) AS boostPoints
      FROM boost_wins
      WHERE challenge_id = 1
      GROUP BY user_id
    ) b ON b.user_id = p.id
    GROUP BY p.id, p.displayName, p.totalPoints, p.daysComplete, b.boostPoints
    ORDER BY canonicalPoints DESC, completeLogDays DESC, p.displayName ASC
  `);

  const [recentRows] = await conn.execute(`
    SELECT
      dl.id,
      dl.participantId,
      p.displayName,
      dl.dayNumber,
      dl.dayComplete,
      dl.pointsAwarded,
      dl.submittedAt,
      dl.updatedAt,
      dl.noAlcohol,
      dl.cleanEating,
      dl.exerciseDone,
      dl.reflectionDone,
      dl.readTeachDone,
      dl.trackedEverything
    FROM daily_logs dl
    JOIN participants p ON p.id = dl.participantId
    ORDER BY COALESCE(dl.updatedAt, dl.createdAt) DESC
    LIMIT 15
  `);

  const mismatches = summaryRows.filter(row => Number(row.storedMinusLogPoints) !== 0 || Number(row.storedMinusCompleteDays) !== 0);
  console.log(JSON.stringify({ summaryRows, mismatches, recentRows }, null, 2));
} finally {
  await conn.end();
}
