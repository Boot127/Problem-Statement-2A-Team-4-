// Dev 2 — work_permit_steps business logic (HLD FR-2.3 / FR-2.5).
// Maps between the frontend's camelCase shape and the SQLite snake_case
// columns, and validates input before it reaches the repository.
//
// Requires permitRepository (not workPermitService) for the parent-existence
// check, so workPermitService can safely require this module for T9 nesting
// without creating a circular dependency.

const permitStepRepository = require('../repositories/permitStepRepository');
const permitRepository = require('../repositories/permitRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');

const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];

const MAX_TITLE = 200;
const MAX_TIMELINE = 120;
const MAX_DETAIL = 2000;

function toApiShape(row) {
  if (!row) return null;
  return {
    id: row.step_id,
    permitId: row.permit_id,
    processType: row.process_type,
    stepNumber: row.step_number,
    stepTitle: row.step_title,
    stepDetail: row.step_detail || '',
    expectedTimeline: row.expected_timeline || '',
  };
}

function requireProcessType(value) {
  const processType = (value || 'NEW').toUpperCase();
  if (!PROCESS_TYPES.includes(processType)) {
    throw new ValidationError(
      `Process type must be one of: ${PROCESS_TYPES.join(', ')}`
    );
  }
  return processType;
}

async function requirePermit(permitId) {
  const permit = await permitRepository.findById(permitId);
  if (!permit) {
    throw new NotFoundError('Work permit not found');
  }
  return permit;
}

function validateStep(data) {
  if (!data.stepTitle || !String(data.stepTitle).trim()) {
    throw new ValidationError('Step title is required');
  }
  if (String(data.stepTitle).length > MAX_TITLE) {
    throw new ValidationError(`Step title must be ${MAX_TITLE} characters or fewer`);
  }
  if (data.stepDetail && String(data.stepDetail).length > MAX_DETAIL) {
    throw new ValidationError(`Step detail must be ${MAX_DETAIL} characters or fewer`);
  }
  if (data.expectedTimeline && String(data.expectedTimeline).length > MAX_TIMELINE) {
    throw new ValidationError(
      `Expected timeline must be ${MAX_TIMELINE} characters or fewer`
    );
  }
  if (data.stepNumber !== undefined && data.stepNumber !== null && data.stepNumber !== '') {
    const stepNumber = Number(data.stepNumber);
    if (!Number.isInteger(stepNumber) || stepNumber < 1) {
      throw new ValidationError('Step number must be a whole number of 1 or more');
    }
  }
}

// Lists a permit's steps, optionally filtered to one process type.
async function listSteps(permitId, processType) {
  await requirePermit(permitId);
  const filter = processType ? requireProcessType(processType) : undefined;
  return (await permitStepRepository.findByPermit(permitId, filter)).map(toApiShape);
}

// Groups every step under its process type, always returning all three keys so
// the frontend can render tabs without null checks.
async function listStepsGrouped(permitId) {
  const grouped = {};
  PROCESS_TYPES.forEach((type) => {
    grouped[type] = [];
  });
  (await permitStepRepository.findByPermit(permitId)).forEach((row) => {
    const step = toApiShape(row);
    if (grouped[step.processType]) {
      grouped[step.processType].push(step);
    }
  });
  return grouped;
}

async function getStep(permitId, stepId) {
  await requirePermit(permitId);
  const row = await permitStepRepository.findById(stepId);
  if (!row || row.permit_id !== Number(permitId)) {
    throw new NotFoundError('Process step not found');
  }
  return toApiShape(row);
}

async function createStep(permitId, data) {
  await requirePermit(permitId);
  const processType = requireProcessType(data.processType);
  validateStep(data);

  // Append to the end of this process type's sequence unless a position is given.
  const stepNumber =
    data.stepNumber === undefined || data.stepNumber === null || data.stepNumber === ''
      ? (await permitStepRepository.maxStepNumber(permitId, processType)) + 1
      : Number(data.stepNumber);

  const row = await permitStepRepository.insert({
    permit_id: Number(permitId),
    process_type: processType,
    step_number: stepNumber,
    step_title: String(data.stepTitle).trim(),
    step_detail: data.stepDetail || null,
    expected_timeline: data.expectedTimeline || null,
  });
  return toApiShape(row);
}

async function updateStep(permitId, stepId, data) {
  const existing = await getStep(permitId, stepId);
  const processType = requireProcessType(data.processType || existing.processType);
  validateStep(data);

  const stepNumber =
    data.stepNumber === undefined || data.stepNumber === null || data.stepNumber === ''
      ? existing.stepNumber
      : Number(data.stepNumber);

  const row = await permitStepRepository.update(stepId, {
    process_type: processType,
    step_number: stepNumber,
    step_title: String(data.stepTitle).trim(),
    step_detail: data.stepDetail || null,
    expected_timeline: data.expectedTimeline || null,
  });
  return toApiShape(row);
}

async function deleteStep(permitId, stepId) {
  await getStep(permitId, stepId);
  await permitStepRepository.remove(stepId);
}

async function reorderSteps(permitId, processTypeInput, stepIds) {
  await requirePermit(permitId);
  const processType = requireProcessType(processTypeInput);

  if (!Array.isArray(stepIds) || stepIds.length === 0) {
    throw new ValidationError('stepIds must be a non-empty array of step ids');
  }

  const existing = await permitStepRepository.findByPermit(permitId, processType);
  const existingIds = existing.map((row) => row.step_id);
  const requested = stepIds.map(Number);

  if (requested.some((id) => !Number.isInteger(id))) {
    throw new ValidationError('stepIds must contain only numeric step ids');
  }
  if (new Set(requested).size !== requested.length) {
    throw new ValidationError('stepIds must not contain duplicates');
  }
  // Require the full sequence so reordering can't silently drop or orphan a step.
  if (
    requested.length !== existingIds.length ||
    requested.some((id) => !existingIds.includes(id))
  ) {
    throw new ValidationError(
      'stepIds must list every step in this process type exactly once'
    );
  }

  return (await permitStepRepository.reorder(permitId, processType, requested)).map(toApiShape);
}

module.exports = {
  PROCESS_TYPES,
  listSteps,
  listStepsGrouped,
  getStep,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
};
