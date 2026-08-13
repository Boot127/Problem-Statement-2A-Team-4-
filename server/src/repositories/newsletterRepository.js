// Dev 4 — Parameterized SQL data access for newsletters + detected_updates
// (docs/HIGH_LEVEL_DESIGN.md, "Legal Updates / Newsletter Management").
// Provider-agnostic via config/database.js, same as every other repository.

const db = require('../config/database');

// Two tables, LEFT JOINed: a newsletter with no AI run yet still returns a
// row with null ai_* fields instead of being hidden.
const SELECT_COLUMNS = `
  n.id, n.title, n.country, n.source, n.published_date, n.status, n.notes,
  n.file_name, n.file_path, n.created_at, n.updated_at,
  d.ai_summary, d.ai_flagged, d.ai_flag_reason,
  d.review_decision, d.linked_compliance_area, d.reviewed_at
`;

function normaliseRow(row) {
  if (!row) return row;
  return {
    ...row,
    ai_flagged: Boolean(row.ai_flagged),
    review_decision: row.review_decision || 'pending',
  };
}

async function listNewsletters({ search = '', country = '', status = '' } = {}) {
  const conditions = ['n.is_deleted = FALSE'];
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (search.trim()) {
    const like = bind(`%${search.trim()}%`);
    conditions.push(`(LOWER(n.title) LIKE LOWER(${like}) OR LOWER(COALESCE(n.source, '')) LIKE LOWER(${like}) OR LOWER(COALESCE(n.notes, '')) LIKE LOWER(${like}))`);
  }
  if (country.trim()) conditions.push(`n.country = ${bind(country.trim())}`);
  if (status.trim()) conditions.push(`n.status = ${bind(status.trim())}`);

  const rows = (
    await db.query(
      `SELECT ${SELECT_COLUMNS}
       FROM newsletters n
       LEFT JOIN detected_updates d ON d.newsletter_id = n.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY n.created_at DESC, n.id DESC`,
      params
    )
  ).rows;

  return rows.map(normaliseRow);
}

async function getNewsletterById(id) {
  const row = (
    await db.query(
      `SELECT ${SELECT_COLUMNS}
       FROM newsletters n
       LEFT JOIN detected_updates d ON d.newsletter_id = n.id
       WHERE n.id = $1 AND n.is_deleted = FALSE`,
      [id]
    )
  ).rows[0];

  return normaliseRow(row);
}

async function createNewsletter(data) {
  const result = await db.query(
    `INSERT INTO newsletters (title, country, source, published_date, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.title, data.country, data.source || null, data.published_date || null, data.status || 'pending', data.notes || null]
  );

  return getNewsletterById(result.rows[0].id);
}

async function updateNewsletter(id, data) {
  await db.query(
    `UPDATE newsletters
     SET title = $1, country = $2, source = $3, published_date = $4,
         status = $5, notes = $6, updated_at = $7
     WHERE id = $8 AND is_deleted = FALSE`,
    [data.title, data.country, data.source || null, data.published_date || null, data.status, data.notes || null, new Date().toISOString(), id]
  );

  return getNewsletterById(id);
}

async function softDeleteNewsletter(id) {
  const result = await db.query(
    `UPDATE newsletters SET is_deleted = TRUE, updated_at = $1 WHERE id = $2 AND is_deleted = FALSE`,
    [new Date().toISOString(), id]
  );
  return result.rowCount > 0;
}

async function attachFile(id, { fileName, filePath }) {
  const result = await db.query(
    `UPDATE newsletters SET file_name = $1, file_path = $2, updated_at = $3 WHERE id = $4 AND is_deleted = FALSE`,
    [fileName, filePath, new Date().toISOString(), id]
  );
  return result.rowCount > 0 ? getNewsletterById(id) : null;
}

// --- detected_updates (1:1 with a newsletter) ------------------------------

function normaliseUpdateRow(row) {
  if (!row) return row;
  return { ...row, ai_flagged: Boolean(row.ai_flagged) };
}

async function getDetectedUpdateByNewsletterId(newsletterId) {
  const row = (
    await db.query(
      `SELECT id, newsletter_id, ai_summary, ai_flagged, ai_flag_reason,
              review_decision, linked_compliance_area, reviewed_at,
              created_at, updated_at
       FROM detected_updates
       WHERE newsletter_id = $1`,
      [newsletterId]
    )
  ).rows[0];

  return normaliseUpdateRow(row);
}

// Re-running AI summarisation on the same newsletter overwrites the previous
// summary and resets the review decision back to "pending", since the
// underlying content may have changed.
async function upsertAiResult(newsletterId, { summary, flagged, reason }) {
  const existing = await getDetectedUpdateByNewsletterId(newsletterId);
  const now = new Date().toISOString();

  if (existing) {
    await db.query(
      `UPDATE detected_updates
       SET ai_summary = $1, ai_flagged = $2, ai_flag_reason = $3,
           review_decision = 'pending', linked_compliance_area = NULL,
           reviewed_at = NULL, updated_at = $4
       WHERE newsletter_id = $5`,
      [summary, Boolean(flagged), reason || null, now, newsletterId]
    );
  } else {
    await db.query(
      `INSERT INTO detected_updates (newsletter_id, ai_summary, ai_flagged, ai_flag_reason, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [newsletterId, summary, Boolean(flagged), reason || null, now]
    );
  }

  return getDetectedUpdateByNewsletterId(newsletterId);
}

async function setReviewDecision(newsletterId, { decision, linkedComplianceArea }) {
  const now = new Date().toISOString();
  const result = await db.query(
    `UPDATE detected_updates
     SET review_decision = $1, linked_compliance_area = $2, reviewed_at = $3, updated_at = $3
     WHERE newsletter_id = $4`,
    [decision, linkedComplianceArea || null, now, newsletterId]
  );
  return result.rowCount > 0 ? getDetectedUpdateByNewsletterId(newsletterId) : null;
}

module.exports = {
  listNewsletters,
  getNewsletterById,
  createNewsletter,
  updateNewsletter,
  softDeleteNewsletter,
  attachFile,
  getDetectedUpdateByNewsletterId,
  upsertAiResult,
  setReviewDecision,
};
