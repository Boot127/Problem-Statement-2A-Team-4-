const db = require('../config/database');

async function counts(maxFailedAttempts) {
  const result = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS active_users,
      (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE) AS administrators,
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND failed_attempts >= $1) AS locked_accounts,
      ((SELECT COUNT(*) FROM compliance_records WHERE status = 'ARCHIVED') +
       (SELECT COUNT(*) FROM work_permits WHERE status = 'ARCHIVED') +
       (SELECT COUNT(*) FROM review_requests WHERE review_status = 'ARCHIVED')) AS archived_items,
      (SELECT COUNT(*) FROM review_requests WHERE review_status = 'PENDING') AS pending_reviews`,
    [maxFailedAttempts]
  );
  return result.rows[0];
}

module.exports = { counts };
