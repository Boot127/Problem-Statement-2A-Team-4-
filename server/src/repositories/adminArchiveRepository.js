const sharedDb = require('../config/db');
const permitDb = require('../config/database');

function pagedShared(sql, countSql, params, { limit, offset }) {
  const total = sharedDb.prepare(countSql).get(...params).total;
  const rows = sharedDb.prepare(`${sql} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, total };
}

function listCompliance({ search, country, type, limit, offset }) {
  const clauses = ["r.status='ARCHIVED'"];
  const params = [];
  if (search) {
    clauses.push('(r.title LIKE ? OR COALESCE(r.summary,\'\') LIKE ? OR c.country_name LIKE ?)');
    const value = `%${search}%`;
    params.push(value, value, value);
  }
  if (country) { clauses.push('c.country_code=?'); params.push(country); }
  if (type) { clauses.push('r.category=?'); params.push(type); }
  const where = `WHERE ${clauses.join(' AND ')}`;
  return pagedShared(
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
  const total = Number((await permitDb.query(`SELECT COUNT(*) total FROM work_permits ${where}`, params)).rows[0].total);
  const pageParams = [...params, limit, offset];
  const rows = (await permitDb.query(
    `SELECT permit_id id,title,country_code,permit_type type,permit_holder_name,client_company_name,
      status,previous_status,archived_at,updated_at
     FROM work_permits ${where}
     ORDER BY COALESCE(archived_at,updated_at) DESC,title
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    pageParams
  )).rows;
  return { rows, total };
}

function listReviews({ search, type, limit, offset }) {
  const clauses = ["r.review_status='ARCHIVED'"];
  const params = [];
  if (search) {
    clauses.push('(r.title LIKE ? OR COALESCE(r.description,\'\') LIKE ?)');
    const value = `%${search}%`;
    params.push(value, value);
  }
  if (type) { clauses.push('r.target_type=?'); params.push(type); }
  const where = `WHERE ${clauses.join(' AND ')}`;
  return pagedShared(
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

function sharedCount(table, statusColumn) {
  return sharedDb.prepare(`SELECT COUNT(*) total FROM ${table} WHERE ${statusColumn}='ARCHIVED'`).get().total;
}

async function archivedCounts() {
  const permit = Number((await permitDb.query("SELECT COUNT(*) total FROM work_permits WHERE status='ARCHIVED'")).rows[0].total);
  return {
    COMPLIANCE_CONTENT: sharedCount('compliance_records', 'status'),
    WORK_PERMIT: permit,
    REVIEW: sharedCount('review_requests', 'review_status'),
  };
}

function complianceFilterOptions() {
  return {
    countries: sharedDb.prepare("SELECT DISTINCT c.country_code value,c.country_name label FROM compliance_records r JOIN countries c ON c.country_id=r.country_id WHERE r.status='ARCHIVED' ORDER BY c.country_name").all(),
    types: sharedDb.prepare("SELECT DISTINCT category value,category label FROM compliance_records WHERE status='ARCHIVED' ORDER BY category").all(),
  };
}

async function permitFilterOptions() {
  const countries = (await permitDb.query("SELECT DISTINCT country_code value,country_code label FROM work_permits WHERE status='ARCHIVED' ORDER BY country_code")).rows;
  const types = (await permitDb.query("SELECT DISTINCT permit_type value,permit_type label FROM work_permits WHERE status='ARCHIVED' ORDER BY permit_type")).rows;
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

function findCompliance(id) {
  return sharedDb.prepare("SELECT * FROM compliance_records WHERE record_id=? AND status='ARCHIVED'").get(id) || null;
}
function complianceAttachments(id) {
  return sharedDb.prepare('SELECT * FROM record_attachments WHERE record_id=?').all(id);
}
function targetHistory(targetType, targetId) {
  return {
    reviews: sharedDb.prepare('SELECT COUNT(*) total FROM review_requests WHERE target_type=? AND target_id=?').get(targetType, targetId).total,
    versions: sharedDb.prepare('SELECT COUNT(*) total FROM record_versions WHERE target_type=? AND target_id=?').get(targetType, targetId).total,
  };
}
function restoreCompliance(id, status, userId, now) {
  sharedDb.prepare(`UPDATE compliance_records SET status=?,previous_status=NULL,archived_at=NULL,updated_by=?,updated_at=? WHERE record_id=? AND status='ARCHIVED'`).run(status,userId,now,id);
  return sharedDb.prepare('SELECT * FROM compliance_records WHERE record_id=?').get(id);
}
function deleteCompliance(id) {
  return sharedDb.prepare("DELETE FROM compliance_records WHERE record_id=? AND status='ARCHIVED'").run(id).changes;
}

async function findPermit(id) {
  return (await permitDb.query("SELECT * FROM work_permits WHERE permit_id=$1 AND status='ARCHIVED'", [id])).rows[0] || null;
}
async function permitSourceDocuments(id) {
  return (await permitDb.query('SELECT * FROM permit_source_documents WHERE permit_id=$1', [id])).rows;
}
async function restorePermit(id, status, now) {
  return (await permitDb.query(
    "UPDATE work_permits SET status=$1,previous_status=NULL,archived_at=NULL,updated_at=$2 WHERE permit_id=$3 AND status='ARCHIVED' RETURNING *",
    [status, now, id]
  )).rows[0] || null;
}
async function deletePermit(id) {
  return (await permitDb.query("DELETE FROM work_permits WHERE permit_id=$1 AND status='ARCHIVED'", [id])).rowCount;
}

function findReview(id) {
  return sharedDb.prepare("SELECT * FROM review_requests WHERE request_id=? AND review_status='ARCHIVED'").get(id) || null;
}
function restoreReview(id, status, now) {
  sharedDb.prepare(`UPDATE review_requests SET review_status=?,previous_status=NULL,archived_at=NULL,updated_at=? WHERE request_id=? AND review_status='ARCHIVED'`).run(status,now,id);
  return sharedDb.prepare('SELECT * FROM review_requests WHERE request_id=?').get(id);
}
function reviewVersionCount(id) {
  return sharedDb.prepare('SELECT COUNT(*) total FROM record_versions WHERE review_id=?').get(id).total;
}
function deleteReview(id) {
  sharedDb.prepare('DELETE FROM review_comments WHERE request_id=?').run(id);
  sharedDb.prepare('DELETE FROM notifications WHERE request_id=?').run(id);
  return sharedDb.prepare("DELETE FROM review_requests WHERE request_id=? AND review_status='ARCHIVED'").run(id).changes;
}

function sharedTransaction(work) { return sharedDb.transaction(work)(); }
function permitTransaction(work) { return permitDb.transaction(work); }

module.exports = {
  listCompliance, listPermits, listReviews, archivedCounts,
  complianceFilterOptions, permitFilterOptions, reviewFilterOptions,
  findCompliance, complianceAttachments, targetHistory, restoreCompliance, deleteCompliance,
  findPermit, permitSourceDocuments, restorePermit, deletePermit,
  findReview, restoreReview, reviewVersionCount, deleteReview,
  sharedTransaction, permitTransaction,
};
