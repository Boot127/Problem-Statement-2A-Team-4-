const app = require('./app');
const database = require('./config/database');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const health = await database.healthCheck();
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
