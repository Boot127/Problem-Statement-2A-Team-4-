// Parameterized SQL data access for compliance_records, benefit_components,
// and record_attachments (docs/HIGH_LEVEL_DESIGN.md Section 12). Provider-
// agnostic — goes through config/database.js, so this runs unchanged on
// SQLite (local dev) or Postgres/Neon (DB_PROVIDER=postgres).

const db = require('../config/database');

function serializeRecord(row, components = [], attachments = []) {
  return {
    id: row.record_id,
    countryId: row.country_id,
    countryCode: row.country_code,
    countryName: row.country_name,
    category: row.category,
    title: row.title,
    summary: row.summary,
    fullText: row.full_text,
    workerType: row.worker_type,
    visibility: row.visibility,
    effectiveDate: row.effective_date,
    sourceUrl: row.source_url,
    version: row.version,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    benefitComponents: components.map(serializeComponent),
    attachments: attachments.map(serializeAttachment),
  };
}

function serializeComponent(row) {
  return {
    id: row.component_id,
    recordId: row.record_id,
    componentName: row.component_name,
    workerType: row.worker_type,
    employerRate: row.employer_rate,
    employeeRate: row.employee_rate,
    capCeiling: row.cap_ceiling,
    calculationBasis: row.calculation_basis,
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

function serializeAttachment(row) {
  return {
    id: row.attachment_id,
    recordId: row.record_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

const BASE_SELECT = `
  SELECT r.*, c.country_code, c.country_name
  FROM compliance_records r
  JOIN countries c ON c.country_id = r.country_id
`;

async function list({ country, category, workerType, status, search, allowedVisibility, page = 1, limit = 20 }) {
  const clauses = [];
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (allowedVisibility && allowedVisibility.length > 0) {
    clauses.push(`r.visibility IN (${allowedVisibility.map((value) => bind(value)).join(',')})`);
  }
  if (country) clauses.push(`c.country_code = ${bind(country)}`);
  if (category) clauses.push(`r.category = ${bind(category)}`);
  if (workerType) clauses.push(`r.worker_type = ${bind(workerType)}`);
  if (status) clauses.push(`r.status = ${bind(status)}`);
  if (search) {
    const like = bind(`%${search}%`);
    clauses.push(`(LOWER(r.title) LIKE LOWER(${like}) OR LOWER(COALESCE(r.summary, '')) LIKE LOWER(${like}) OR LOWER(COALESCE(r.full_text, '')) LIKE LOWER(${like}))`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const total = Number(
    (
      await db.query(
        `SELECT COUNT(*) AS count FROM compliance_records r JOIN countries c ON c.country_id = r.country_id ${where}`,
        params
      )
    ).rows[0].count
  );

  const rows = (
    await db.query(
      `${BASE_SELECT} ${where} ORDER BY r.title LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, offset]
    )
  ).rows;

  return {
    data: rows.map((row) => serializeRecord(row)),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
  };
}

async function findById(id, allowedVisibility) {
  const row = (await db.query(`${BASE_SELECT} WHERE r.record_id = $1`, [id])).rows[0];
  if (!row) return null;
  if (allowedVisibility && !allowedVisibility.includes(row.visibility)) return null;

  const components = (
    await db.query('SELECT * FROM benefit_components WHERE record_id = $1 ORDER BY sort_order, component_id', [id])
  ).rows;
  const attachments = (
    await db.query('SELECT * FROM record_attachments WHERE record_id = $1 ORDER BY uploaded_at DESC', [id])
  ).rows;

  return serializeRecord(row, components, attachments);
}

async function create(data, userId) {
  const result = await db.query(
    `INSERT INTO compliance_records
      (country_id, category, title, summary, full_text, worker_type, visibility, effective_date, source_url, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', $10, $11)
     RETURNING record_id`,
    [
      data.countryId,
      data.category,
      data.title,
      data.summary || null,
      data.fullText || null,
      data.workerType || 'ALL_EMPLOYEES',
      data.visibility || 'INTERNAL_STAFF',
      data.effectiveDate || null,
      data.sourceUrl || null,
      userId,
      userId,
    ]
  );
  return findById(result.rows[0].record_id);
}

// Deliberately never touches `status` or `version` — publishing (which
// advances version and flips status to PUBLISHED) belongs to the review
// workflow (FR-3.5), and archiving has its own dedicated action (FR-1.7).
async function update(id, data, userId) {
  await db.query(
    `UPDATE compliance_records SET
       country_id = $1, category = $2, title = $3, summary = $4, full_text = $5,
       worker_type = $6, visibility = $7, effective_date = $8, source_url = $9,
       updated_by = $10, updated_at = $11
     WHERE record_id = $12`,
    [
      data.countryId,
      data.category,
      data.title,
      data.summary || null,
      data.fullText || null,
      data.workerType || 'ALL_EMPLOYEES',
      data.visibility || 'INTERNAL_STAFF',
      data.effectiveDate || null,
      data.sourceUrl || null,
      userId,
      new Date().toISOString(),
      id,
    ]
  );
  return findById(id);
}

async function archive(id, userId) {
  const now = new Date().toISOString();
  await db.query(
    `UPDATE compliance_records SET
       previous_status = CASE WHEN status != 'ARCHIVED' THEN status ELSE previous_status END,
       status = 'ARCHIVED', archived_at = $1,
       updated_by = $2, updated_at = $1
     WHERE record_id = $3`,
    [now, userId, id]
  );
  return findById(id);
}

async function addComponent(recordId, data) {
  const result = await db.query(
    `INSERT INTO benefit_components
      (record_id, component_name, worker_type, employer_rate, employee_rate, cap_ceiling, calculation_basis, notes, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      recordId,
      data.componentName,
      data.workerType || 'ALL_EMPLOYEES',
      data.employerRate || null,
      data.employeeRate || null,
      data.capCeiling || null,
      data.calculationBasis || null,
      data.notes || null,
      data.sortOrder || 0,
    ]
  );
  return serializeComponent(result.rows[0]);
}

async function getComponent(componentId) {
  const row = (await db.query('SELECT * FROM benefit_components WHERE component_id = $1', [componentId])).rows[0];
  return row ? serializeComponent(row) : null;
}

async function updateComponent(componentId, data) {
  await db.query(
    `UPDATE benefit_components SET
       component_name = $1, worker_type = $2, employer_rate = $3, employee_rate = $4,
       cap_ceiling = $5, calculation_basis = $6, notes = $7
     WHERE component_id = $8`,
    [
      data.componentName,
      data.workerType || 'ALL_EMPLOYEES',
      data.employerRate || null,
      data.employeeRate || null,
      data.capCeiling || null,
      data.calculationBasis || null,
      data.notes || null,
      componentId,
    ]
  );
  return getComponent(componentId);
}

async function removeComponent(componentId) {
  await db.query('DELETE FROM benefit_components WHERE component_id = $1', [componentId]);
}

async function removeAttachment(attachmentId) {
  await db.query('DELETE FROM record_attachments WHERE attachment_id = $1', [attachmentId]);
}

async function addAttachment(recordId, data, userId) {
  const result = await db.query(
    `INSERT INTO record_attachments (record_id, file_name, file_path, file_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [recordId, data.fileName, data.filePath, data.fileType || null, userId]
  );
  return serializeAttachment(result.rows[0]);
}

async function exists(id) {
  return Boolean((await db.query('SELECT 1 AS present FROM compliance_records WHERE record_id = $1', [id])).rows[0]);
}

// record_versions is written by the review workflow's publish action (Dev
// 3 — server/src/repositories/reviewRepository.js `publish()`), which
// already handles compliance_record as a target_type generically. This is a
// read-only view of that table from the Compliance Content side.
function serializeVersion(row) {
  return {
    id: row.version_id,
    version: row.version,
    publishedAt: row.published_at,
    reviewId: row.review_id,
    snapshot: JSON.parse(row.snapshot),
  };
}

async function findVersions(recordId) {
  const rows = (
    await db.query(
      `SELECT * FROM record_versions WHERE target_type = 'compliance_record' AND target_id = $1 ORDER BY version DESC`,
      [recordId]
    )
  ).rows;
  return rows.map(serializeVersion);
}

// Case-insensitive match on country + title + effective date, used to catch
// the "same fact entered twice with different values" problem the HLD calls
// out directly (Section 2). NULL-safe on effective_date via IS NOT DISTINCT
// FROM (SQLite treats IS the same way; Postgres needs IS NOT DISTINCT FROM
// for NULL-safe equality since it has no bare `IS <value>` for non-boolean
// operands).
async function findDuplicate(countryId, title, effectiveDate, ignoreId) {
  const row = (
    await db.query(
      `SELECT record_id FROM compliance_records
       WHERE country_id = $1
         AND lower(title) = lower($2)
         AND effective_date IS NOT DISTINCT FROM $3
         AND record_id != $4`,
      [countryId, title, effectiveDate, ignoreId ?? -1]
    )
  ).rows[0];
  return Boolean(row);
}

module.exports = {
  list,
  findById,
  create,
  update,
  archive,
  addComponent,
  addAttachment,
  exists,
  findDuplicate,
  findVersions,
  updateComponent,
  removeComponent,
  removeAttachment,
  serializeRecord,
};
