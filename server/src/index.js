const app = require('./app');
const database = require('./config/database');

const PORT = process.env.PORT || 5000;

const CONNECT_ATTEMPTS = 5;

// A Neon branch on the free tier suspends when idle and has to cold-start on
// the next connection, which can take longer than postgresDb's 10s pool
// timeout. Failing the very first attempt would exit the process, which a
// host like Render reports as a failed deploy rather than a slow database —
// so give the database a few tries before giving up.
async function connectWithRetry() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await database.healthCheck();
    } catch (error) {
      if (attempt >= CONNECT_ATTEMPTS) throw error;
      const waitMs = attempt * 2000;
      console.warn(
        `Database not ready (attempt ${attempt}/${CONNECT_ATTEMPTS}): ${error.message}. Retrying in ${waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function start() {
  try {
    const health = await connectWithRetry();
    console.log(
      health.provider === 'postgres'
        ? 'Database connected: PostgreSQL / Neon'
        : 'Database connected: SQLite (legacy rollback provider)'
    );
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

start();
