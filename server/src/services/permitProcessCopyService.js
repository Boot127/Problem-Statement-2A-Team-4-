const permitRepository = require('../repositories/permitRepository');
const stepRepository = require('../repositories/permitStepRepository');
const documentRepository = require('../repositories/permitDocumentRepository');
const copyRepository = require('../repositories/permitProcessCopyRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');

const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];
const MODES = ['APPEND', 'REPLACE'];

function requireId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError(`Invalid ${label}`);
  return id;
}

async function requireEditablePermit(value, label) {
  const id = requireId(value, `${label} permit id`);
  const permit = await permitRepository.findById(id);
  if (!permit) throw new NotFoundError(`${label} work permit not found`);
  if (permit.status === 'ARCHIVED') throw new ValidationError(`${label} work permit is archived`);
  return permit;
}

function boolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  throw new ValidationError('Include options must be true or false');
}

function stepKey(step) {
  return [step.step_title, step.step_detail || '', step.expected_timeline || ''].join('\u0000').toLowerCase();
}

function documentKey(document) {
  return [document.document_name, document.is_mandatory, document.notes || ''].join('\u0000').toLowerCase();
}

async function copyProcess(destinationPermitIdInput, data = {}) {
  const destination = await requireEditablePermit(destinationPermitIdInput, 'Destination');
  const source = await requireEditablePermit(data.sourcePermitId, 'Source');
  if (source.permit_id === destination.permit_id) {
    throw new ValidationError('Source and destination permits must be different');
  }

  const processType = String(data.processType || '').trim().toUpperCase();
  if (!PROCESS_TYPES.includes(processType)) {
    throw new ValidationError(`Process type must be one of: ${PROCESS_TYPES.join(', ')}`);
  }
  const includeSteps = boolean(data.includeSteps, true);
  const includeDocuments = boolean(data.includeDocuments, true);
  if (!includeSteps && !includeDocuments) {
    throw new ValidationError('Select process steps, required documents, or both');
  }

  const sourceSteps = includeSteps ? await stepRepository.findByPermit(source.permit_id, processType) : [];
  const sourceDocuments = includeDocuments
    ? await documentRepository.findByPermit(source.permit_id, processType)
    : [];
  if (sourceSteps.length === 0 && sourceDocuments.length === 0) {
    throw new ValidationError('The selected source process has no content to copy');
  }

  const destinationSteps = includeSteps
    ? await stepRepository.findByPermit(destination.permit_id, processType)
    : [];
  const destinationDocuments = includeDocuments
    ? await documentRepository.findByPermit(destination.permit_id, processType)
    : [];
  const hasDestinationContent = destinationSteps.length > 0 || destinationDocuments.length > 0;
  const rawMode = data.mode ? String(data.mode).trim().toUpperCase() : '';
  if (hasDestinationContent && !rawMode) {
    throw new ValidationError('Choose Append or Replace Existing because the destination process already contains data');
  }
  const mode = rawMode || 'APPEND';
  if (!MODES.includes(mode)) throw new ValidationError('Copy mode must be APPEND or REPLACE');

  let steps = sourceSteps;
  let documents = sourceDocuments;
  let skippedStepDuplicates = 0;
  let skippedDocumentDuplicates = 0;
  if (mode === 'APPEND') {
    const existingStepKeys = new Set(destinationSteps.map(stepKey));
    steps = sourceSteps.filter((step) => {
      const duplicate = existingStepKeys.has(stepKey(step));
      if (duplicate) skippedStepDuplicates += 1;
      return !duplicate;
    });
    const existingDocumentKeys = new Set(destinationDocuments.map(documentKey));
    documents = sourceDocuments.filter((document) => {
      const duplicate = existingDocumentKeys.has(documentKey(document));
      if (duplicate) skippedDocumentDuplicates += 1;
      return !duplicate;
    });
  }

  const result = await copyRepository.executeCopy({
    destinationPermitId: destination.permit_id,
    processType,
    mode,
    includeSteps,
    includeDocuments,
    steps,
    documents,
  });

  return {
    sourcePermitId: source.permit_id,
    destinationPermitId: destination.permit_id,
    processType,
    mode,
    copiedSteps: steps.length,
    copiedDocuments: documents.length,
    skippedStepDuplicates,
    skippedDocumentDuplicates,
    ...result,
  };
}

module.exports = { copyProcess };
