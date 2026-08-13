const { createDirectPool, safeMessage } = require('./postgresScriptUtils');
const { ensureEmptyDestination } = require('./migrateSqliteToPostgres');

const SEEDS = [
  ['SG','Employment Pass (EP)','Singapore Employment Pass','Work pass for foreign professionals, managers, and executives.','Job offer from a Singapore-registered company and applicable qualifying criteria.',21,24,105,'SGD','FOREIGN_WORKER','CLIENT_SHAREABLE','https://www.mom.gov.sg/passes-and-permits/employment-pass','PUBLISHED'],
  ['MY','Employment Pass','Malaysia Employment Pass','Pass for expatriates in managerial, executive, or specialist roles.','Applicable employer, salary, qualification, and experience requirements.',20,24,125,'MYR','EXPATRIATE','INTERNAL_STAFF',null,'DRAFT'],
];

async function run() {
  if (String(process.env.ENABLE_DEV_SEED || 'false').toLowerCase() !== 'true') {
    throw new Error('Development seeding is disabled; set ENABLE_DEV_SEED=true explicitly');
  }
  const pool = createDirectPool();
  const client = await pool.connect();
  try {
    try {
      await ensureEmptyDestination(client);
    } catch (error) {
      throw new Error(`Development seed requires a completely empty application database. ${error.message}`);
    }
    await client.query('BEGIN');
    try {
      const now = new Date().toISOString();
      for (const row of SEEDS) {
        await client.query(
          `INSERT INTO work_permits
            (country_code,permit_type,title,description,eligibility_criteria,processing_time_days,
             validity_months,government_fee,currency_code,worker_type,visibility,source_url,status,
             version,information_status,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,1,'CURRENT',$14,$14)`,
          [...row, now]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(`${SEEDS.length} development permits seeded`);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`Development seed failed: ${safeMessage(error)}`);
    process.exitCode = 1;
  });
}

module.exports = { run };
