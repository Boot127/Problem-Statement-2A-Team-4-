const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');

const migrationDirectory = path.join(__dirname, '..', 'database', 'postgres');

async function run() {
  const pool = createDirectPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS dev2_schema_migrations (
        migration_name TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const files = fs.readdirSync(migrationDirectory).filter((name) => name.endsWith('.sql')).sort();
    for (const fileName of files) {
      const sql = fs.readFileSync(path.join(migrationDirectory, fileName), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const existing = await client.query(
        'SELECT checksum FROM dev2_schema_migrations WHERE migration_name = $1',
        [fileName]
      );
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Applied migration ${fileName} has been modified`);
        }
        console.log(`Already applied: ${fileName}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO dev2_schema_migrations (migration_name, checksum) VALUES ($1, $2)',
          [fileName, checksum]
        );
        await client.query('COMMIT');
        console.log(`Applied: ${fileName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    console.log('PostgreSQL migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`Migration failed: ${safeMessage(error)}`);
  process.exitCode = 1;
});
