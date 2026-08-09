const db = require('../config/database');

async function paged(sql, countSql, params, { limit, offset }) {
  const total = Number((await db.query(countSql, params)).rows[0].total);
  const rows = (
    await db.query(`${sql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset])
  ).rows;
  return { rows, total };
}

async function listCompliance({ search, country, type, limit, offset }) {
  const clauses = ["r.status='ARCHIVED'"];
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (search) {
    const like = bind(`%${search}%`);
    clauses.push(`(r.title LIKE ${like} OR COALESCE(r.summary,'') LIKE ${like} OR c.country_name LIKE ${like})`);
  }
  if (country) clauses.push(`c.country_code=${bind(country)}`);
  if (type) clauses.push(`r.category=${bind(type)}`);
  const where = `WHERE ${clauses.join(' AND ')}`;
  return paged(
    `SELECT r.record_id id,r.title,c.country_code country_code,c.country_name country_name,
      r.category type,r.status,r.previous_status,r.archived_at,r.updated_at,
      (SELECT COUNT(*) FROM record_attachments a WHERE a.record_id=r.record_id) attachment_count,
      (SELECT COUNT(*) FROM benefit_components b WHERE b.record_id=r.record_id) component_count,
      (SELECT COUNT(*) FROM review_requests q WHERE q.target_type='compliance_record' AND q.target_id=r.record_id) review_count,
      (SELECT COUNT(*) FROM record_versions v WHERE v.target_type='compliance_record' AND v.target_id=r.record_id) version_count
     FROM compliance_records r JOIN countries c ON c.country_id=r.country_id ${where}
     ORDER BY COALESCE(r.archived_at,r.updated_at) DESC,r.title`,
    `SELECT COUNT(*) total FROM compliance_records r JOIN countries c ON c.country_id=r.country_id ${where}`,
    params,
    { limit, offset }
  );
}

async function listPermits({ search, country, type, limit, offset }) {
  const clauses = ["status='ARCHIVED'"];
  const params = [];
  const bind = (value) => { params.push(value); return `$${params.length}`; };
  if (search) {
    const value = bind(`%${search}%`);
    clauses.push(`(LOWER(title) LIKE LOWER(${value}) OR LOWER(COALESCE(permit_holder_name,'')) LIKE LOWER(${value}) OR LOWER(COALESCE(client_company_name,'')) LIKE LOWER(${value}))`);
  }
  if (country) clauses.push(`country_code=${bind(country)}`);
  if (type) clauses.push(`permit_type=${bind(type)}`);
  const where = `WHERE ${clauses.join(' AND ')}`;
  const total = Number((await db.query(`SELECT COUNT(*) total FROM work_permits ${where}`, params)).rows[0].total);
  const pageParams = [...params, limit, offset];
  const rows = (await db.query(
    `SELECT permit_id id,title,country_code,permit_type type,permit_holder_name,client_company_name,
      status,previous_status,archived_at,updated_at
     FROM work_permits ${where}
     ORDER BY COALESCE(archived_at,updated_at) DESC,title
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    pageParams
  )).rows;
  return { rows, total };
}

async function listReviews({ search, type, limit, offset }) {
  const clauses = ["r.review_status='ARCHIVED'"];
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (search) {
    const like = bind(`%${search}%`);
    clauses.push(`(r.title LIKE ${like} OR COALESCE(r.description,'') LIKE ${like})`);
  }
  if (type) clauses.push(`r.target_type=${bind(type)}`);
  const where = `WHERE ${clauses.join(' AND ')}`;
  return paged(
    `SELECT r.request_id id,r.title,r.target_type,r.target_id,r.review_status status,
      r.previous_status,r.submitted_by,r.reviewed_by,r.created_at,r.archived_at,r.updated_at,
      CASE r.target_type
        WHEN 'compliance_record' THEN (SELECT title FROM compliance_records WHERE record_id=r.target_id)
        WHEN 'work_permit' THEN (SELECT title FROM work_permits WHERE permit_id=r.target_id)
      END target_title,
      (SELECT COUNT(*) FROM record_versions v WHERE v.review_id=r.request_id) version_count,
      (SELECT COUNT(*) FROM review_comments c WHERE c.request_id=r.request_id) comment_count
     FROM review_requests r ${where}
     ORDER BY COALESCE(r.archived_at,r.updated_at) DESC,r.title`,
    `SELECT COUNT(*) total FROM review_requests r ${where}`,
    params,
    { limit, offset }
  );
}

async function sharedCount(table, statusColumn) {
  return Number((await db.query(`SELECT COUNT(*) total FROM ${table} WHERE ${statusColumn}='ARCHIVED'`)).rows[0].total);
}

async function archivedCounts() {
  const [permit, compliance, review] = await Promise.all([
    sharedCount('work_permits', 'status'),
    sharedCount('compliance_records', 'status'),
    sharedCount('review_requests', 'review_status'),
  ]);
  return { COMPLIANCE_CONTENT: compliance, WORK_PERMIT: permit, REVIEW: review };
}

async function complianceFilterOptions() {
  const [countries, types] = await Promise.all([
    db.query("SELECT DISTINCT c.country_code value,c.country_name label FROM compliance_records r JOIN countries c ON c.country_id=r.country_id WHERE r.status='ARCHIVED' ORDER BY c.country_name"),
    db.query("SELECT DISTINCT category value,category label FROM compliance_records WHERE status='ARCHIVED' ORDER BY category"),
  ]);
  return { countries: countries.rows, types: types.rows };
}

async function permitFilterOptions() {
  const countries = (await db.query("SELECT DISTINCT country_code value,country_code label FROM work_permits WHERE status='ARCHIVED' ORDER BY country_code")).rows;
  const types = (await db.query("SELECT DISTINCT permit_type value,permit_type label FROM work_permits WHERE status='ARCHIVED' ORDER BY permit_type")).rows;
  return { countries, types };
}

function reviewFilterOptions() {
  return {
    countries: [],
    types: [
      { value: 'compliance_record', label: 'Compliance Content' },
      { value: 'work_permit', label: 'Work Permit' },
    ],
  };
}

async function findCompliance(id) {
  return (await db.query("SELECT * FROM compliance_records WHERE record_id=$1 AND status='ARCHIVED'", [id])).rows[0] || null;
}
async function complianceAttachments(id) {
  return (await db.query('SELECT * FROM record_attachments WHERE record_id=$1', [id])).rows;
}
async function targetHistory(targetType, targetId) {
  const [reviews, versions] = await Promise.all([
    db.query('SELECT COUNT(*) total FROM review_requests WHERE target_type=$1 AND target_id=$2', [targetType, targetId]),
    db.query('SELECT COUNT(*) total FROM record_versions WHERE target_type=$1 AND target_id=$2', [targetType, targetId]),
  ]);
  return { reviews: Number(reviews.rows[0].total), versions: Number(versions.rows[0].total) };
}
async function restoreCompliance(id, status, userId, now) {
  const result = await db.query(
    `UPDATE compliance_records SET status=$1,previous_status=NULL,archived_at=NULL,updated_by=$2,updated_at=$3 WHERE record_id=$4 AND status='ARCHIVED' RETURNING *`,
    [status, userId, now, id]
  );
  return result.rows[0] || null;
}
async function deleteCompliance(id) {
  return (await db.query("DELETE FROM compliance_records WHERE record_id=$1 AND status='ARCHIVED'", [id])).rowCount;
}

async function findPermit(id) {
  return (await db.query("SELECT * FROM work_permits WHERE permit_id=$1 AND status='ARCHIVED'", [id])).rows[0] || null;
}
async function permitSourceDocuments(id) {
  return (await db.query('SELECT * FROM permit_source_documents WHERE permit_id=$1', [id])).rows;
}
async function restorePermit(id, status, now) {
  return (await db.query(
    "UPDATE work_permits SET status=$1,previous_status=NULL,archived_at=NULL,updated_at=$2 WHERE permit_id=$3 AND status='ARCHIVED' RETURNING *",
    [status, now, id]
  )).rows[0] || null;
}
async function deletePermit(id) {
  return (await db.query("DELETE FROM work_permits WHERE permit_id=$1 AND status='ARCHIVED'", [id])).rowCount;
}

async function findReview(id) {
  return (await db.query("SELECT * FROM review_requests WHERE request_id=$1 AND review_status='ARCHIVED'", [id])).rows[0] || null;
}
async function restoreReview(id, status, now) {
  const result = await db.query(
    `UPDATE review_requests SET review_status=$1,previous_status=NULL,archived_at=NULL,updated_at=$2 WHERE request_id=$3 AND review_status='ARCHIVED' RETURNING *`,
    [status, now, id]
  );
  return result.rows[0] || null;
}
async function reviewVersionCount(id) {
  return Number((await db.query('SELECT COUNT(*) total FROM record_versions WHERE review_id=$1', [id])).rows[0].total);
}
async function deleteReview(id) {
  await db.query('DELETE FROM review_comments WHERE request_id=$1', [id]);
  await db.query('DELETE FROM notifications WHERE request_id=$1', [id]);
  return (await db.query("DELETE FROM review_requests WHERE request_id=$1 AND review_status='ARCHIVED'", [id])).rowCount;
}

// Every table this repository touches now goes through the same
// config/database.js connection, so there is only one transaction helper —
// kept as two names (sharedTransaction/permitTransaction) so
// adminArchiveService.js's existing call sites don't need to change which
// one they call, only that they now await it.
function sharedTransaction(work) { return db.transaction(work); }
function permitTransaction(work) { return db.transaction(work); }

module.exports = {
  listCompliance, listPermits, listReviews, archivedCounts,
  complianceFilterOptions, permitFilterOptions, reviewFilterOptions,
  findCompliance, complianceAttachments, targetHistory, restoreCompliance, deleteCompliance,
  findPermit, permitSourceDocuments, restorePermit, deletePermit,
  findReview, restoreReview, reviewVersionCount, deleteReview,
  sharedTransaction, permitTransaction,
};
