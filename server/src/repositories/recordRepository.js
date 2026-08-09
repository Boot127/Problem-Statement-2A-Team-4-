// Parameterized SQL data access for compliance_records, benefit_components,
// and record_attachments (docs/HIGH_LEVEL_DESIGN.md Section 12).

const db = require('../config/db');

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

function list({ country, category, workerType, status, search, allowedVisibility, page = 1, limit = 20 }) {
  const clauses = [];
  const params = [];

  if (allowedVisibility && allowedVisibility.length > 0) {
    clauses.push(`r.visibility IN (${allowedVisibility.map(() => '?').join(',')})`);
    params.push(...allowedVisibility);
  }
  if (country) {
    clauses.push('c.country_code = ?');
    params.push(country);
  }
  if (category) {
    clauses.push('r.category = ?');
    params.push(category);
  }
  if (workerType) {
    clauses.push('r.worker_type = ?');
    params.push(workerType);
  }
  if (status) {
    clauses.push('r.status = ?');
    params.push(status);
  }
  if (search) {
    clauses.push('(r.title LIKE ? OR r.summary LIKE ? OR r.full_text LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM compliance_records r JOIN countries c ON c.country_id = r.country_id ${where}`)
    .get(...params).count;

  const rows = db
    .prepare(`${BASE_SELECT} ${where} ORDER BY r.title LIMIT ? OFFSET ?`)
    .all(...params, safeLimit, offset);

  return {
    data: rows.map((row) => serializeRecord(row)),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
  };
}

function findById(id, allowedVisibility) {
  const row = db.prepare(`${BASE_SELECT} WHERE r.record_id = ?`).get(id);
  if (!row) return null;
  if (allowedVisibility && !allowedVisibility.includes(row.visibility)) return null;

  const components = db
    .prepare('SELECT * FROM benefit_components WHERE record_id = ? ORDER BY sort_order, component_id')
    .all(id);
  const attachments = db
    .prepare('SELECT * FROM record_attachments WHERE record_id = ? ORDER BY uploaded_at DESC')
    .all(id);

  return serializeRecord(row, components, attachments);
}

function create(data, userId) {
  const info = db
    .prepare(
      `INSERT INTO compliance_records
        (country_id, category, title, summary, full_text, worker_type, visibility, effective_date, source_url, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)`
    )
    .run(
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
      userId
    );
  return findById(info.lastInsertRowid);
}

// Deliberately never touches `status` or `version` — publishing (which
// advances version and flips status to PUBLISHED) belongs to the review
// workflow (FR-3.5), and archiving has its own dedicated action (FR-1.7).
function update(id, data, userId) {
  db.prepare(
    `UPDATE compliance_records SET
       country_id = ?, category = ?, title = ?, summary = ?, full_text = ?,
       worker_type = ?, visibility = ?, effective_date = ?, source_url = ?,
       updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE record_id = ?`
  ).run(
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
    id
  );
  return findById(id);
}

function archive(id, userId) {
  db.prepare(
    `UPDATE compliance_records SET
       previous_status = CASE WHEN status != 'ARCHIVED' THEN status ELSE previous_status END,
       status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP,
       updated_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE record_id = ?`
  ).run(userId, id);
  return findById(id);
}

function addComponent(recordId, data) {
  const info = db
    .prepare(
      `INSERT INTO benefit_components
        (record_id, component_name, worker_type, employer_rate, employee_rate, cap_ceiling, calculation_basis, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      recordId,
      data.componentName,
      data.workerType || 'ALL_EMPLOYEES',
      data.employerRate || null,
      data.employeeRate || null,
      data.capCeiling || null,
      data.calculationBasis || null,
      data.notes || null,
      data.sortOrder || 0
    );
  return serializeComponent(db.prepare('SELECT * FROM benefit_components WHERE component_id = ?').get(info.lastInsertRowid));
}

function getComponent(componentId) {
  const row = db.prepare('SELECT * FROM benefit_components WHERE component_id = ?').get(componentId);
  return row ? serializeComponent(row) : null;
}

function updateComponent(componentId, data) {
  db.prepare(
    `UPDATE benefit_components SET
       component_name = ?, worker_type = ?, employer_rate = ?, employee_rate = ?,
       cap_ceiling = ?, calculation_basis = ?, notes = ?
     WHERE component_id = ?`
  ).run(
    data.componentName,
    data.workerType || 'ALL_EMPLOYEES',
    data.employerRate || null,
    data.employeeRate || null,
    data.capCeiling || null,
    data.calculationBasis || null,
    data.notes || null,
    componentId
  );
  return getComponent(componentId);
}

function removeComponent(componentId) {
  db.prepare('DELETE FROM benefit_components WHERE component_id = ?').run(componentId);
}

function removeAttachment(attachmentId) {
  db.prepare('DELETE FROM record_attachments WHERE attachment_id = ?').run(attachmentId);
}

function addAttachment(recordId, data, userId) {
  const info = db
    .prepare(
      `INSERT INTO record_attachments (record_id, file_name, file_path, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(recordId, data.fileName, data.filePath, data.fileType || null, userId);
  return serializeAttachment(
    db.prepare('SELECT * FROM record_attachments WHERE attachment_id = ?').get(info.lastInsertRowid)
  );
}

function exists(id) {
  return Boolean(db.prepare('SELECT 1 FROM compliance_records WHERE record_id = ?').get(id));
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

function findVersions(recordId) {
  return db
    .prepare(
      `SELECT * FROM record_versions WHERE target_type = 'compliance_record' AND target_id = ? ORDER BY version DESC`
    )
    .all(recordId)
    .map(serializeVersion);
}

// Case-insensitive match on country + title + effective date, used to catch
// the "same fact entered twice with different values" problem the HLD calls
// out directly (Section 2). NULL-safe on effective_date via IS.
function findDuplicate(countryId, title, effectiveDate, ignoreId) {
  const row = db
    .prepare(
      `SELECT record_id FROM compliance_records
       WHERE country_id = ?
         AND lower(title) = lower(?)
         AND effective_date IS ?
         AND record_id != ?`
    )
    .get(countryId, title, effectiveDate, ignoreId ?? -1);
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
