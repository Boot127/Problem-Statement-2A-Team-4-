const db = require('../config/database');

async function findByPermit(permitId, { includeArchived = true } = {}) {
  const sql = `SELECT * FROM permit_source_documents WHERE permit_id=$1
    ${includeArchived ? '' : "AND status='ACTIVE'"}
    ORDER BY (status='ARCHIVED'), uploaded_at DESC, source_document_id DESC`;
  return (await db.query(sql, [permitId])).rows;
}

async function findById(id) {
  return (await db.query('SELECT * FROM permit_source_documents WHERE source_document_id=$1', [id])).rows[0] || null;
}

async function findByHash(permitId, hash, { excludeId } = {}) {
  const params = [permitId, hash];
  let sql = "SELECT * FROM permit_source_documents WHERE permit_id=$1 AND file_hash=$2 AND status='ACTIVE'";
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND source_document_id != $${params.length}`;
  }
  return (await db.query(sql, params)).rows[0] || null;
}

async function countActiveByPermit(permitId) {
  const row = (await db.query("SELECT COUNT(*) AS total FROM permit_source_documents WHERE permit_id=$1 AND status='ACTIVE'", [permitId])).rows[0];
  return Number(row.total);
}

async function countActiveByPermits() {
  const rows = (await db.query("SELECT permit_id, COUNT(*) AS total FROM permit_source_documents WHERE status='ACTIVE' GROUP BY permit_id")).rows;
  return Object.fromEntries(rows.map((row) => [row.permit_id, Number(row.total)]));
}

async function insert(row) {
  const result = await db.query(
    `INSERT INTO permit_source_documents
      (permit_id,original_file_name,stored_file_name,mime_type,file_size,file_hash,description,source_type,status,uploaded_by,uploaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [row.permit_id,row.original_file_name,row.stored_file_name,row.mime_type,row.file_size,row.file_hash,row.description,row.source_type,row.status,row.uploaded_by,row.uploaded_at]
  );
  return result.rows[0];
}

async function update(id, row) {
  const result = await db.query(
    'UPDATE permit_source_documents SET description=$1, source_type=$2, status=$3 WHERE source_document_id=$4 RETURNING *',
    [row.description, row.source_type, row.status, id]
  );
  return result.rows[0] || null;
}

async function replaceFile(id, row) {
  const result = await db.query(
    `UPDATE permit_source_documents SET original_file_name=$1, stored_file_name=$2,
      mime_type=$3, file_size=$4, file_hash=$5, uploaded_at=$6
     WHERE source_document_id=$7 RETURNING *`,
    [row.original_file_name,row.stored_file_name,row.mime_type,row.file_size,row.file_hash,row.uploaded_at,id]
  );
  return result.rows[0] || null;
}

async function setStatus(id, status) {
  const result = await db.query(
    'UPDATE permit_source_documents SET status=$1 WHERE source_document_id=$2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  return (await db.query('DELETE FROM permit_source_documents WHERE source_document_id=$1', [id])).rowCount;
}

module.exports = { findByPermit, findById, findByHash, countActiveByPermit, countActiveByPermits, insert, update, replaceFile, setStatus, remove };
