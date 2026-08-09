const db = require('../config/database');

async function findByPermit(permitId, processType) {
  const params = [permitId];
  let sql = 'SELECT * FROM work_permit_steps WHERE permit_id = $1';
  if (processType) {
    params.push(processType);
    sql += ` AND process_type = $${params.length}`;
  }
  sql += ' ORDER BY process_type, step_number, step_id';
  return (await db.query(sql, params)).rows;
}

async function findById(stepId) {
  return (await db.query('SELECT * FROM work_permit_steps WHERE step_id = $1', [stepId])).rows[0] || null;
}

async function maxStepNumber(permitId, processType) {
  const result = await db.query(
    'SELECT COALESCE(MAX(step_number), 0) AS max_number FROM work_permit_steps WHERE permit_id = $1 AND process_type = $2',
    [permitId, processType]
  );
  return Number(result.rows[0].max_number);
}

async function insert(row) {
  const result = await db.query(
    `INSERT INTO work_permit_steps
      (permit_id, process_type, step_number, step_title, step_detail, expected_timeline)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [row.permit_id, row.process_type, row.step_number, row.step_title, row.step_detail, row.expected_timeline]
  );
  return result.rows[0];
}

async function update(stepId, row) {
  const result = await db.query(
    `UPDATE work_permit_steps SET process_type=$1, step_number=$2, step_title=$3,
       step_detail=$4, expected_timeline=$5 WHERE step_id=$6 RETURNING *`,
    [row.process_type, row.step_number, row.step_title, row.step_detail, row.expected_timeline, stepId]
  );
  return result.rows[0] || null;
}

async function remove(stepId) {
  return (await db.query('DELETE FROM work_permit_steps WHERE step_id = $1', [stepId])).rowCount;
}

async function reorder(permitId, processType, orderedStepIds) {
  await db.transaction(async () => {
    for (const [index, stepId] of orderedStepIds.entries()) {
      await db.query(
        'UPDATE work_permit_steps SET step_number=$1 WHERE step_id=$2 AND permit_id=$3 AND process_type=$4',
        [index + 1, stepId, permitId, processType]
      );
    }
  });
  return findByPermit(permitId, processType);
}

module.exports = { findByPermit, findById, maxStepNumber, insert, update, remove, reorder };
