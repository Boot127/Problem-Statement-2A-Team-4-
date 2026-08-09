const service = require('../services/permitGroupService');

const includeArchived = (req) => req.query.includeArchived === 'true';

async function list(req, res, next) {
  try { res.json(await service.listGroups({ includeArchived: includeArchived(req) })); } catch (error) { next(error); }
}

async function getById(req, res, next) {
  try { res.json(await service.getGroup(req.params.groupId)); } catch (error) { next(error); }
}

async function create(req, res, next) {
  try { res.status(201).json(await service.createGroup(req.body || {})); } catch (error) { next(error); }
}

async function update(req, res, next) {
  try { res.json(await service.updateGroup(req.params.groupId, req.body || {})); } catch (error) { next(error); }
}

async function archive(req, res, next) {
  try { res.json(await service.archiveGroup(req.params.groupId)); } catch (error) { next(error); }
}

async function restore(req, res, next) {
  try { res.json(await service.restoreGroup(req.params.groupId)); } catch (error) { next(error); }
}

async function addMember(req, res, next) {
  try { res.status(201).json(await service.addMember(req.params.groupId, req.body?.permitId)); } catch (error) { next(error); }
}

async function removeMember(req, res, next) {
  try { res.json(await service.removeMember(req.params.groupId, req.params.permitId)); } catch (error) { next(error); }
}

async function forPermit(req, res, next) {
  try { res.json(await service.listGroupsForPermit(req.params.id, { includeArchived: includeArchived(req) })); } catch (error) { next(error); }
}

module.exports = { list, getById, create, update, archive, restore, addMember, removeMember, forPermit };
