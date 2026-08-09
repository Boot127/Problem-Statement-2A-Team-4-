const db = require('../config/database');

async function findByPermit(permitId, processType) {
  const params = [permitId];
  let sql = 'SELECT * FROM permit_documents WHERE permit_id = $1';
  if (processType) {
    params.push(processType);
    sql += ` AND process_type = $${params.length}`;
  }
  sql += ' ORDER BY process_type, sort_order, document_id';
  return (await db.query(sql, params)).rows;
}

async function findById(documentId) {
  return (await db.query('SELECT * FROM permit_documents WHERE document_id=$1', [documentId])).rows[0] || null;
}

async function maxSortOrder(permitId, processType) {
  const result = await db.query(
    'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM permit_documents WHERE permit_id=$1 AND process_type=$2',
    [permitId, processType]
  );
  return Number(result.rows[0].max_order);
}

async function insert(row) {
  const result = await db.query(
    `INSERT INTO permit_documents
      (permit_id, process_type, document_name, is_mandatory, notes, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [row.permit_id, row.process_type, row.document_name, Boolean(row.is_mandatory), row.notes, row.sort_order]
  );
  return result.rows[0];
}

async function update(documentId, row) {
  const result = await db.query(
    `UPDATE permit_documents SET process_type=$1, document_name=$2, is_mandatory=$3,
       notes=$4, sort_order=$5 WHERE document_id=$6 RETURNING *`,
    [row.process_type, row.document_name, Boolean(row.is_mandatory), row.notes, row.sort_order, documentId]
  );
  return result.rows[0] || null;
}

async function remove(documentId) {
  return (await db.query('DELETE FROM permit_documents WHERE document_id=$1', [documentId])).rowCount;
}

async function reorder(permitId, processType, orderedDocumentIds) {
  await db.transaction(async () => {
    for (const [index, documentId] of orderedDocumentIds.entries()) {
      await db.query(
        'UPDATE permit_documents SET sort_order=$1 WHERE document_id=$2 AND permit_id=$3 AND process_type=$4',
        [index + 1, documentId, permitId, processType]
      );
    }
  });
  return findByPermit(permitId, processType);
}

module.exports = { findByPermit, findById, maxSortOrder, insert, update, remove, reorder };
