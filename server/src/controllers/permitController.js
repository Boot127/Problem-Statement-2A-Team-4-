// Dev 2 — work_permits request handlers (mirrors permitRoutes.js)

const workPermitService = require('../services/workPermitService');

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: 'Invalid permit id' });
    return null;
  }
  return id;
}

function list(req, res, next) {
  try {
    const { search, country, status } = req.query;
    const permits = workPermitService.listPermits({ search, country, status });
    res.json(permits);
  } catch (err) {
    next(err);
  }
}

function getById(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = workPermitService.getPermitById(id);
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

function create(req, res, next) {
  try {
    const permit = workPermitService.createPermit(req.body || {});
    res.status(201).json(permit);
  } catch (err) {
    next(err);
  }
}

function update(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = workPermitService.updatePermit(id, req.body || {});
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

function archive(req, res, next) {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const permit = workPermitService.archivePermit(id);
    if (!permit) {
      res.status(404).json({ message: 'Work permit not found' });
      return;
    }
    res.json(permit);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, archive };
