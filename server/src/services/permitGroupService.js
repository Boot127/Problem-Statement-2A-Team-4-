const repository = require('../repositories/permitGroupRepository');
const workPermitService = require('./workPermitService');
const { ValidationError, NotFoundError } = require('../utils/errors');

const MAX_NAME = 160;
const MAX_DESCRIPTION = 1000;
const ATTENTION_STATES = new Set(['REVIEW_DUE', 'OUTDATED', 'INCOMPLETE']);

function requireId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError(`Invalid ${label}`);
  return id;
}

async function requireGroup(groupId) {
  const id = requireId(groupId, 'permit group id');
  const group = await repository.findById(id);
  if (!group) throw new NotFoundError('Permit group not found');
  return group;
}

function groupInput(data = {}, existing = null) {
  const name = data.groupName === undefined && existing ? existing.group_name : String(data.groupName || '').trim();
  if (!name) throw new ValidationError('Group name is required');
  if (name.length > MAX_NAME) throw new ValidationError(`Group name must be ${MAX_NAME} characters or fewer`);
  const rawDescription = data.description === undefined && existing ? existing.description : data.description;
  const description = rawDescription === undefined || rawDescription === null || rawDescription === ''
    ? null
    : String(rawDescription).trim();
  if (description && description.length > MAX_DESCRIPTION) {
    throw new ValidationError(`Description must be ${MAX_DESCRIPTION} characters or fewer`);
  }
  return { group_name: name, description };
}

function basicShape(row) {
  return {
    id: row.group_id,
    groupName: row.group_name,
    description: row.description || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    addedAt: row.added_at,
  };
}

function summarise(row, permits) {
  const countryCodes = [...new Set(permits.map((permit) => permit.countryCode))].sort();
  return {
    ...basicShape(row),
    permitCount: permits.length,
    countryCount: countryCodes.length,
    needsAttentionCount: permits.filter((permit) => ATTENTION_STATES.has(permit.health?.reviewState)).length,
    reviewDueCount: permits.filter((permit) => permit.health?.reviewState === 'REVIEW_DUE').length,
    countryCodes,
  };
}

async function loadPermitsByGroup(rows) {
  const memberships = await repository.findMemberships(rows.map((row) => row.group_id));
  const permitCache = new Map();
  await Promise.all([...new Set(memberships.map((item) => item.permit_id))].map(async (permitId) => {
    permitCache.set(permitId, await workPermitService.getPermitById(permitId));
  }));
  const byGroup = new Map(rows.map((row) => [row.group_id, []]));
  memberships.forEach((membership) => {
    const permit = permitCache.get(membership.permit_id);
    if (permit) byGroup.get(membership.group_id)?.push({ ...permit, groupAddedAt: membership.added_at });
  });
  return byGroup;
}

async function listGroups({ includeArchived = false } = {}) {
  const rows = await repository.findAll({ includeArchived });
  const byGroup = await loadPermitsByGroup(rows);
  return rows.map((row) => summarise(row, byGroup.get(row.group_id) || []));
}

async function getGroup(groupId) {
  const row = await requireGroup(groupId);
  const permits = (await loadPermitsByGroup([row])).get(row.group_id) || [];
  permits.sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.title.localeCompare(b.title));
  return { ...summarise(row, permits), permits };
}

async function createGroup(data) {
  const input = groupInput(data);
  const now = new Date().toISOString();
  try {
    const group = await repository.insert({ ...input, status: 'ACTIVE', created_at: now, updated_at: now });
    return getGroup(group.group_id);
  } catch (error) {
    if (String(error.code).includes('SQLITE_CONSTRAINT') || error.code === '23505') throw new ValidationError('A permit group with this name already exists');
    throw error;
  }
}

async function updateGroup(groupId, data) {
  const existing = await requireGroup(groupId);
  try {
    await repository.update(existing.group_id, { ...groupInput(data, existing), updated_at: new Date().toISOString() });
    return getGroup(existing.group_id);
  } catch (error) {
    if (String(error.code).includes('SQLITE_CONSTRAINT') || error.code === '23505') throw new ValidationError('A permit group with this name already exists');
    throw error;
  }
}

async function setGroupStatus(groupId, status) {
  const group = await requireGroup(groupId);
  await repository.setStatus(group.group_id, status, new Date().toISOString());
  return getGroup(group.group_id);
}

async function addMember(groupId, permitIdInput) {
  const group = await requireGroup(groupId);
  if (group.status === 'ARCHIVED') throw new ValidationError('Restore this permit group before adding permits');
  const permitId = requireId(permitIdInput, 'permit id');
  const permit = await workPermitService.getPermitById(permitId);
  if (!permit) throw new NotFoundError('Work permit not found');
  if (permit.status === 'ARCHIVED') throw new ValidationError('Archived permits cannot be added to an active permit group');
  if (await repository.findMembership(group.group_id, permitId)) throw new ValidationError('This permit is already in the group');
  await repository.addMember(group.group_id, permitId, new Date().toISOString());
  return getGroup(group.group_id);
}

async function removeMember(groupId, permitIdInput) {
  const group = await requireGroup(groupId);
  if (group.status === 'ARCHIVED') throw new ValidationError('Restore this permit group before removing permits');
  const permitId = requireId(permitIdInput, 'permit id');
  if (!await repository.removeMember(group.group_id, permitId)) throw new NotFoundError('Permit group membership not found');
  return getGroup(group.group_id);
}

async function listGroupsForPermit(permitIdInput, { includeArchived = false } = {}) {
  const permitId = requireId(permitIdInput, 'permit id');
  if (!await workPermitService.getPermitById(permitId)) throw new NotFoundError('Work permit not found');
  return (await repository.findGroupsForPermit(permitId, { includeArchived })).map(basicShape);
}

module.exports = {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  archiveGroup: (id) => setGroupStatus(id, 'ARCHIVED'),
  restoreGroup: (id) => setGroupStatus(id, 'ACTIVE'),
  addMember,
  removeMember,
  listGroupsForPermit,
};
