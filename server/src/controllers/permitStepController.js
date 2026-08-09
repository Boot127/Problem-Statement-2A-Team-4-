// Dev 2 — work_permit_steps request handlers (mirrors permitRoutes.js).

const permitStepService = require('../services/permitStepService');
const { ValidationError } = require('../utils/errors');

// Shared id parsing: throws a 400 so the errorHandler formats it consistently.
function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return id;
}

async function list(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    res.json(await permitStepService.listSteps(permitId, req.query.processType));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const stepId = parseId(req.params.stepId, 'step id');
    res.json(await permitStepService.getStep(permitId, stepId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    res.status(201).json(await permitStepService.createStep(permitId, req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const stepId = parseId(req.params.stepId, 'step id');
    res.json(await permitStepService.updateStep(permitId, stepId, req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const stepId = parseId(req.params.stepId, 'step id');
    await permitStepService.deleteStep(permitId, stepId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function reorder(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const { processType, stepIds } = req.body || {};
    res.json(await permitStepService.reorderSteps(permitId, processType, stepIds));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, reorder };
