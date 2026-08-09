const db = require('../config/database');

async function findAll({ includeArchived = false } = {}) {
  return (await db.query(`SELECT * FROM permit_groups
    ${includeArchived ? '' : "WHERE status='ACTIVE'"}
    ORDER BY (status='ARCHIVED'), LOWER(group_name), group_id`)).rows;
}

async function findById(groupId) {
  return (await db.query('SELECT * FROM permit_groups WHERE group_id=$1', [groupId])).rows[0] || null;
}

async function findMemberships(groupIds) {
  if (!groupIds.length) return [];
  const placeholders = groupIds.map((_id, index) => `$${index + 1}`).join(',');
  return (await db.query(
    `SELECT group_id, permit_id, added_at FROM permit_group_members
     WHERE group_id IN (${placeholders}) ORDER BY group_id, added_at, permit_id`,
    groupIds
  )).rows;
}

async function findMembership(groupId, permitId) {
  return (await db.query(
    'SELECT * FROM permit_group_members WHERE group_id=$1 AND permit_id=$2',
    [groupId, permitId]
  )).rows[0] || null;
}

async function findGroupsForPermit(permitId, { includeArchived = false } = {}) {
  return (await db.query(
    `SELECT g.*, m.added_at FROM permit_groups g
     JOIN permit_group_members m ON m.group_id=g.group_id
     WHERE m.permit_id=$1 ${includeArchived ? '' : "AND g.status='ACTIVE'"}
     ORDER BY (g.status='ARCHIVED'), LOWER(g.group_name)`,
    [permitId]
  )).rows;
}

async function insert(row) {
  return (await db.query(
    `INSERT INTO permit_groups (group_name,description,status,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [row.group_name,row.description,row.status,row.created_at,row.updated_at]
  )).rows[0];
}

async function update(groupId, row) {
  return (await db.query(
    'UPDATE permit_groups SET group_name=$1, description=$2, updated_at=$3 WHERE group_id=$4 RETURNING *',
    [row.group_name,row.description,row.updated_at,groupId]
  )).rows[0] || null;
}

async function setStatus(groupId, status, updatedAt) {
  return (await db.query(
    'UPDATE permit_groups SET status=$1, updated_at=$2 WHERE group_id=$3 RETURNING *',
    [status,updatedAt,groupId]
  )).rows[0] || null;
}

async function addMember(groupId, permitId, addedAt) {
  return (await db.query(
    'INSERT INTO permit_group_members (group_id,permit_id,added_at) VALUES ($1,$2,$3) RETURNING *',
    [groupId,permitId,addedAt]
  )).rows[0];
}

async function removeMember(groupId, permitId) {
  return (await db.query(
    'DELETE FROM permit_group_members WHERE group_id=$1 AND permit_id=$2',
    [groupId,permitId]
  )).rowCount;
}

module.exports = { findAll, findById, findMemberships, findMembership, findGroupsForPermit, insert, update, setStatus, addMember, removeMember };
