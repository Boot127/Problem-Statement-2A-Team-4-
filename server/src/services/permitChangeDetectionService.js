const db = require('../config/database');
const workPermitService = require('./workPermitService');
const permitStepService = require('./permitStepService');
const permitDocumentService = require('./permitDocumentService');
const sourceService = require('./permitSourceDocumentService');
const { extractDocumentText } = require('./permitDocumentTextService');
const { createPermitChangeDetectionProvider, comparable } = require('./permitChangeDetectionProvider');
const { SCALAR_FIELDS, PROCESS_TYPES } = require('./permitExtractionProvider');
const { ValidationError, NotFoundError } = require('../utils/errors');

const VALID_CHANGE_TYPES = ['ADDED', 'CHANGED', 'REMOVED'];
const VALID_KINDS = ['PERMIT_FIELD', 'STEP', 'DOCUMENT'];
const NUMERIC_FIELDS = new Set(['processingTimeDays', 'validityMonths', 'governmentFee']);

async function requireEditablePermit(permitId) {
  const permit = await workPermitService.getPermitById(permitId);
  if (!permit) throw new NotFoundError('Work permit not found');
  if (permit.status === 'ARCHIVED') throw new ValidationError('Archived permits cannot be compared or updated');
  return permit;
}

async function compareSourceDocument(permitId, documentId, { provider } = {}) {
  const permit = await requireEditablePermit(permitId);
  const source = await sourceService.getSourceDocument(permitId, documentId);
  if (source.status !== 'ACTIVE') throw new ValidationError('Restore this source document before checking it for changes');
  const target = await sourceService.getDownloadTarget(permitId, documentId);
  const extracted = await extractDocumentText(target.filePath, target.mimeType);
  const selectedProvider = provider || createPermitChangeDetectionProvider();
  const result = await selectedProvider.compare(extracted.text, permit);
  return {
    providerMode: selectedProvider.mode,
    sourceDocument: source,
    extractedCharacters: extracted.text.length,
    textTruncated: extracted.truncated,
    possibleChangeCount: result.possibleChangeCount,
    unchangedCount: result.unchangedCount,
    changes: result.changes.map((change, index) => ({ ...change, id: `${change.id}-${index + 1}` })),
  };
}

function cleanChange(change) {
  if (!change || !VALID_KINDS.includes(change.kind) || !VALID_CHANGE_TYPES.includes(change.changeType)) {
    throw new ValidationError('A selected source change is invalid');
  }
  if (change.processType && !PROCESS_TYPES.includes(change.processType)) {
    throw new ValidationError('A selected source change has an invalid process type');
  }
  return change;
}

function assertCurrentValue(actual, expected) {
  if (comparable(actual) !== comparable(expected)) {
    throw new ValidationError('Permit information changed after this comparison. Run Check for Changes again.');
  }
}

function assertCurrentObject(actual, expected, keys) {
  keys.forEach((key) => assertCurrentValue(actual?.[key], expected?.[key]));
}

function applyPermitField(permit, change, updates) {
  const field = SCALAR_FIELDS.find((name) => (change.id || '').includes(`-${name}-`) || name === change.field);
  if (!field) {
    const labelMap = {
      Country: 'countryCode', 'Permit type': 'permitType', Title: 'title', Description: 'description',
      Eligibility: 'eligibilityCriteria', 'Processing time': 'processingTimeDays', Validity: 'validityMonths',
      'Government fee': 'governmentFee', Currency: 'currencyCode', 'Worker type': 'workerType',
    };
    change.field = labelMap[change.label];
  }
  const targetField = field || change.field;
  if (!SCALAR_FIELDS.includes(targetField)) throw new ValidationError('A selected permit field is not supported');
  assertCurrentValue(permit[targetField], change.current);
  updates[targetField] = NUMERIC_FIELDS.has(targetField) && change.proposed !== null
    ? Number(change.proposed)
    : change.proposed;
}

async function applyStep(permitId, change, affectedProcesses) {
  const processType = change.processType;
  affectedProcesses.add(processType);
  if (change.changeType === 'ADDED') {
    await permitStepService.createStep(permitId, { ...change.proposed, processType });
    return;
  }
  const current = await permitStepService.getStep(permitId, change.currentId);
  assertCurrentObject(current, change.current, ['processType', 'stepNumber', 'stepTitle', 'stepDetail', 'expectedTimeline']);
  if (change.changeType === 'REMOVED') await permitStepService.deleteStep(permitId, change.currentId);
  else await permitStepService.updateStep(permitId, change.currentId, { ...change.proposed, processType });
}

async function applyDocument(permitId, change, affectedProcesses) {
  const processType = change.processType;
  affectedProcesses.add(processType);
  if (change.changeType === 'ADDED') {
    await permitDocumentService.createDocument(permitId, { ...change.proposed, processType });
    return;
  }
  const current = await permitDocumentService.getDocument(permitId, change.currentId);
  assertCurrentObject(current, change.current, ['processType', 'sortOrder', 'documentName', 'isMandatory', 'notes']);
  if (change.changeType === 'REMOVED') await permitDocumentService.deleteDocument(permitId, change.currentId);
  else await permitDocumentService.updateDocument(permitId, change.currentId, { ...change.proposed, processType });
}

async function normaliseAffectedSequences(permitId, processTypes) {
  for (const processType of processTypes) {
    const steps = (await permitStepService.listSteps(permitId, processType))
      .sort((a, b) => a.stepNumber - b.stepNumber || a.id - b.id);
    if (steps.length) await permitStepService.reorderSteps(permitId, processType, steps.map((step) => step.id));
    const documents = (await permitDocumentService.listDocuments(permitId, processType))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    if (documents.length) await permitDocumentService.reorderDocuments(permitId, processType, documents.map((document) => document.id));
  }
}

async function applyReviewedChanges(permitId, documentId, payload = {}) {
  const permit = await requireEditablePermit(permitId);
  const source = await sourceService.getSourceDocument(permitId, documentId);
  if (source.status !== 'ACTIVE') throw new ValidationError('Restore this source document before accepting changes');
  if (!Array.isArray(payload.changes) || payload.changes.length === 0) {
    throw new ValidationError('Select at least one possible change to accept');
  }
  if (payload.changes.length > 200) throw new ValidationError('Too many changes were submitted at once');
  const changes = payload.changes.map(cleanChange);
  const fieldUpdates = {};
  const affectedProcesses = new Set();

  await db.transaction(async () => {
    for (const change of changes) {
      if (change.kind === 'PERMIT_FIELD') applyPermitField(permit, change, fieldUpdates);
      if (change.kind === 'STEP') await applyStep(permit.id, change, affectedProcesses);
      if (change.kind === 'DOCUMENT') await applyDocument(permit.id, change, affectedProcesses);
    }
    await normaliseAffectedSequences(permit.id, affectedProcesses);
    const marker = `AI change review from ${source.fileName}: ${changes.length} accepted change${changes.length === 1 ? '' : 's'}`;
    await workPermitService.updatePermit(permit.id, {
      ...permit,
      ...fieldUpdates,
      status: 'DRAFT',
      reviewNotes: [permit.reviewNotes, marker].filter(Boolean).join('\n').slice(0, 1000),
    });
  });
  return {
    permit: await workPermitService.getPermitById(permit.id),
    appliedCount: changes.length,
    sourceDocumentId: source.id,
    forcedStatus: 'DRAFT',
  };
}

module.exports = { compareSourceDocument, applyReviewedChanges };
