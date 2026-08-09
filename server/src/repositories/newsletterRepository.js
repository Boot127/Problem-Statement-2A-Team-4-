// Dev 4 — Parameterized SQL data access for newsletters + detected_updates
// (docs/HIGH_LEVEL_DESIGN.md, "Legal Updates / Newsletter Management").
// Mirrors the pattern used by recordRepository.js / reviewRepository.js.

const db = require('../config/db');

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

function listNewsletters({ search = '', country = '', status = '' } = {}) {
  const conditions = ['n.is_deleted = 0'];
  const params = [];

  if (search.trim()) {
    conditions.push('(n.title LIKE ? OR n.source LIKE ? OR n.notes LIKE ?)');
    const value = `%${search.trim()}%`;
    params.push(value, value, value);
  }

  if (country.trim()) {
    conditions.push('n.country = ?');
    params.push(country.trim());
  }

  if (status.trim()) {
    conditions.push('n.status = ?');
    params.push(status.trim());
  }

  const statement = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM newsletters n
    LEFT JOIN detected_updates d ON d.newsletter_id = n.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY datetime(n.created_at) DESC, n.id DESC
  `);

  return statement.all(...params).map(normaliseRow);
}

function getNewsletterById(id) {
  const statement = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM newsletters n
    LEFT JOIN detected_updates d ON d.newsletter_id = n.id
    WHERE n.id = ? AND n.is_deleted = 0
  `);

  return normaliseRow(statement.get(id));
}

function createNewsletter(data) {
  const statement = db.prepare(`
    INSERT INTO newsletters (title, country, source, published_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = statement.run(
    data.title,
    data.country,
    data.source || null,
    data.published_date || null,
    data.status || 'pending',
    data.notes || null
  );

  return getNewsletterById(Number(result.lastInsertRowid));
}

function updateNewsletter(id, data) {
  const statement = db.prepare(`
    UPDATE newsletters
    SET title = ?, country = ?, source = ?, published_date = ?,
        status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `);

  statement.run(
    data.title,
    data.country,
    data.source || null,
    data.published_date || null,
    data.status,
    data.notes || null,
    id
  );

  return getNewsletterById(id);
}

function softDeleteNewsletter(id) {
  const statement = db.prepare(`
    UPDATE newsletters
    SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `);

  const result = statement.run(id);
  return Number(result.changes) > 0;
}

function attachFile(id, { fileName, filePath }) {
  const statement = db.prepare(`
    UPDATE newsletters
    SET file_name = ?, file_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `);

  const result = statement.run(fileName, filePath, id);
  return Number(result.changes) > 0 ? getNewsletterById(id) : null;
}

// --- detected_updates (1:1 with a newsletter) ------------------------------

function normaliseUpdateRow(row) {
  if (!row) return row;
  return { ...row, ai_flagged: Boolean(row.ai_flagged) };
}

function getDetectedUpdateByNewsletterId(newsletterId) {
  const statement = db.prepare(`
    SELECT id, newsletter_id, ai_summary, ai_flagged, ai_flag_reason,
           review_decision, linked_compliance_area, reviewed_at,
           created_at, updated_at
    FROM detected_updates
    WHERE newsletter_id = ?
  `);

  return normaliseUpdateRow(statement.get(newsletterId));
}

// Re-running AI summarisation on the same newsletter overwrites the previous
// summary and resets the review decision back to "pending", since the
// underlying content may have changed.
function upsertAiResult(newsletterId, { summary, flagged, reason }) {
  const existing = getDetectedUpdateByNewsletterId(newsletterId);

  if (existing) {
    db.prepare(`
      UPDATE detected_updates
      SET ai_summary = ?, ai_flagged = ?, ai_flag_reason = ?,
          review_decision = 'pending', linked_compliance_area = NULL,
          reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE newsletter_id = ?
    `).run(summary, flagged ? 1 : 0, reason || null, newsletterId);
  } else {
    db.prepare(`
      INSERT INTO detected_updates (newsletter_id, ai_summary, ai_flagged, ai_flag_reason)
      VALUES (?, ?, ?, ?)
    `).run(newsletterId, summary, flagged ? 1 : 0, reason || null);
  }

  return getDetectedUpdateByNewsletterId(newsletterId);
}

function setReviewDecision(newsletterId, { decision, linkedComplianceArea }) {
  const statement = db.prepare(`
    UPDATE detected_updates
    SET review_decision = ?, linked_compliance_area = ?,
        reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE newsletter_id = ?
  `);

  const result = statement.run(decision, linkedComplianceArea || null, newsletterId);
  return Number(result.changes) > 0 ? getDetectedUpdateByNewsletterId(newsletterId) : null;
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
