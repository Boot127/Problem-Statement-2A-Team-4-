const db = require('../config/database');

function buildFilter(filters = {}, { ignoreStatus = false } = {}) {
  let sql = ' WHERE 1=1';
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.country) sql += ` AND p.country_code=${bind(filters.country)}`;
  if (!ignoreStatus && filters.status) sql += ` AND p.status=${bind(filters.status)}`;
  if (filters.workerType) sql += ` AND p.worker_type=${bind(filters.workerType)}`;
  if (filters.visibility) sql += ` AND p.visibility=${bind(filters.visibility)}`;
  if (filters.hasSource !== undefined) {
    const exists = "EXISTS (SELECT 1 FROM permit_source_documents sd WHERE sd.permit_id=p.permit_id AND sd.status='ACTIVE')";
    sql += ` AND ${filters.hasSource ? exists : `NOT ${exists}`}`;
  }
  for (const [key, type] of [['hasRenewal','RENEWAL'],['hasCancellation','CANCELLATION']]) {
    if (filters[key] !== undefined) {
      const exists = `EXISTS (
        SELECT 1 FROM work_permit_steps ps WHERE ps.permit_id=p.permit_id AND ps.process_type='${type}'
        UNION ALL
        SELECT 1 FROM permit_documents pd WHERE pd.permit_id=p.permit_id AND pd.process_type='${type}'
      )`;
      sql += ` AND ${filters[key] ? exists : `NOT ${exists}`}`;
    }
  }
  if (filters.processCompleteness) {
    const hasStep = (type) => `EXISTS (SELECT 1 FROM work_permit_steps ps WHERE ps.permit_id=p.permit_id AND ps.process_type='${type}')`;
    const hasDocument = (type) => `EXISTS (SELECT 1 FROM permit_documents pd WHERE pd.permit_id=p.permit_id AND pd.process_type='${type}')`;
    const complete = (type, required = false) => required
      ? `(${hasStep(type)} AND ${hasDocument(type)})`
      : `((${hasStep(type)} AND ${hasDocument(type)}) OR (NOT ${hasStep(type)} AND NOT ${hasDocument(type)}))`;
    const all = `(${complete('NEW', true)} AND ${complete('RENEWAL')} AND ${complete('CANCELLATION')})`;
    sql += ` AND ${filters.processCompleteness === 'COMPLETE' ? all : `NOT ${all}`}`;
  }
  if (filters.minFee !== undefined) sql += ` AND p.government_fee>=${bind(filters.minFee)}`;
  if (filters.maxFee !== undefined) sql += ` AND p.government_fee<=${bind(filters.maxFee)}`;
  if (filters.minProcessingDays !== undefined) sql += ` AND p.processing_time_days>=${bind(filters.minProcessingDays)}`;
  if (filters.maxProcessingDays !== undefined) sql += ` AND p.processing_time_days<=${bind(filters.maxProcessingDays)}`;
  if (filters.nextReviewFrom) sql += ` AND p.next_review_at>=${bind(filters.nextReviewFrom)}`;
  if (filters.nextReviewTo) sql += ` AND p.next_review_at<=${bind(filters.nextReviewTo)}`;
  if (filters.search) {
    const like = bind(`%${filters.search}%`);
    const match = (column) => `LOWER(COALESCE(${column},'')) LIKE LOWER(${like})`;
    sql += ` AND (
      ${['p.title','p.permit_type','p.country_code','p.permit_holder_name','p.client_company_name','p.description','p.eligibility_criteria'].map(match).join(' OR ')}
      OR EXISTS (SELECT 1 FROM work_permit_steps ps WHERE ps.permit_id=p.permit_id AND (${match('ps.step_title')} OR ${match('ps.step_detail')}))
      OR EXISTS (SELECT 1 FROM permit_documents pd WHERE pd.permit_id=p.permit_id AND ${match('pd.document_name')})
      OR EXISTS (SELECT 1 FROM permit_source_documents sd WHERE sd.permit_id=p.permit_id AND ${match('sd.original_file_name')})
    )`;
  }
  return { sql, params };
}

const CHILD_COUNT_JOIN = `
  LEFT JOIN (
    SELECT permit_id,
      SUM(CASE WHEN process_type='NEW' THEN 1 ELSE 0 END) new_steps,
      SUM(CASE WHEN process_type='RENEWAL' THEN 1 ELSE 0 END) renewal_steps,
      SUM(CASE WHEN process_type='CANCELLATION' THEN 1 ELSE 0 END) cancellation_steps
    FROM work_permit_steps GROUP BY permit_id
  ) sc ON sc.permit_id=p.permit_id
  LEFT JOIN (
    SELECT permit_id,
      SUM(CASE WHEN process_type='NEW' THEN 1 ELSE 0 END) new_docs,
      SUM(CASE WHEN process_type='RENEWAL' THEN 1 ELSE 0 END) renewal_docs,
      SUM(CASE WHEN process_type='CANCELLATION' THEN 1 ELSE 0 END) cancellation_docs
    FROM permit_documents GROUP BY permit_id
  ) dc ON dc.permit_id=p.permit_id`;

const CHILD_COUNT_COLUMNS = `
  COALESCE(sc.new_steps,0) new_steps, COALESCE(sc.renewal_steps,0) renewal_steps,
  COALESCE(sc.cancellation_steps,0) cancellation_steps, COALESCE(dc.new_docs,0) new_docs,
  COALESCE(dc.renewal_docs,0) renewal_docs, COALESCE(dc.cancellation_docs,0) cancellation_docs`;

async function findAll(filters = {}, { limit, offset } = {}) {
  const { sql, params } = buildFilter(filters);
  let query = `SELECT p.*, ${CHILD_COUNT_COLUMNS} FROM work_permits p ${CHILD_COUNT_JOIN} ${sql} ORDER BY p.title`;
  if (limit !== undefined && limit !== null) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    params.push(offset || 0);
    query += ` OFFSET $${params.length}`;
  }
  return (await db.query(query, params)).rows;
}

async function countAll(filters = {}) {
  const { sql, params } = buildFilter(filters);
  return Number((await db.query(`SELECT COUNT(*) total FROM work_permits p ${sql}`, params)).rows[0].total);
}

async function countByStatus(filters = {}) {
  const { sql, params } = buildFilter(filters, { ignoreStatus: true });
  const rows = (await db.query(`SELECT p.status, COUNT(*) count FROM work_permits p ${sql} GROUP BY p.status`, params)).rows;
  const counts = { total: 0, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
  rows.forEach((row) => {
    counts[row.status] = Number(row.count);
    counts.total += Number(row.count);
  });
  return counts;
}

async function findById(id) {
  return (await db.query('SELECT * FROM work_permits WHERE permit_id=$1', [id])).rows[0] || null;
}

async function findByIdWithCounts(id) {
  return (await db.query(
    `SELECT p.*, ${CHILD_COUNT_COLUMNS} FROM work_permits p ${CHILD_COUNT_JOIN} WHERE p.permit_id=$1`,
    [id]
  )).rows[0] || null;
}

async function findDuplicates(countryCode, permitType, excludeId) {
  const params = [countryCode, permitType];
  let sql = `SELECT * FROM work_permits WHERE UPPER(country_code)=UPPER($1)
    AND UPPER(TRIM(permit_type))=UPPER(TRIM($2))`;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND permit_id != $${params.length}`;
  }
  return (await db.query(`${sql} ORDER BY title`, params)).rows;
}

const WRITE_COLUMNS = [
  'country_code','permit_type','title','permit_holder_name','client_company_name','description',
  'eligibility_criteria','processing_time_days','validity_months','government_fee','currency_code',
  'worker_type','visibility','source_url','version','status','last_reviewed_at','next_review_at',
  'review_notes','information_status','created_at','updated_at',
];

async function insert(row) {
  const values = WRITE_COLUMNS.map((column) => row[column]);
  const placeholders = values.map((_value, index) => `$${index + 1}`).join(',');
  return (await db.query(
    `INSERT INTO work_permits (${WRITE_COLUMNS.join(',')}) VALUES (${placeholders}) RETURNING *`,
    values
  )).rows[0];
}

async function update(id, row) {
  const columns = WRITE_COLUMNS.filter((column) => column !== 'created_at');
  const values = columns.map((column) => row[column]);
  const assignments = columns.map((column, index) => `${column}=$${index + 1}`).join(',');
  values.push(id);
  return (await db.query(
    `UPDATE work_permits SET ${assignments} WHERE permit_id=$${values.length} RETURNING *`,
    values
  )).rows[0] || null;
}

async function archive(id, updatedAt) {
  return (await db.query(
    "UPDATE work_permits SET status='ARCHIVED', updated_at=$1 WHERE permit_id=$2 RETURNING *",
    [updatedAt,id]
  )).rows[0] || null;
}

module.exports = { findAll, countAll, countByStatus, findById, findByIdWithCounts, findDuplicates, insert, update, archive };
