// Dev 2 — permit_documents business logic (HLD FR-2.4).
// Maps between the frontend's camelCase shape and the SQLite snake_case
// columns, including the is_mandatory 0/1 ↔ boolean conversion (SQLite has
// no native BOOLEAN type).
//
// Requires permitRepository (not workPermitService) for the parent-existence
// check, so workPermitService can safely require this module for T9 nesting.

const permitDocumentRepository = require('../repositories/permitDocumentRepository');
const permitRepository = require('../repositories/permitRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');

const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];

const MAX_NAME = 200;
const MAX_NOTES = 500;

function toApiShape(row) {
  if (!row) return null;
  return {
    id: row.document_id,
    permitId: row.permit_id,
    processType: row.process_type,
    documentName: row.document_name,
    isMandatory: row.is_mandatory === true || row.is_mandatory === 1,
    notes: row.notes || '',
    sortOrder: row.sort_order,
  };
}

// Accepts real booleans and the common string/number forms a JSON client may
// send. Defaults to true (mandatory), matching the schema default.
function toMandatoryFlag(value) {
  if (value === undefined || value === null || value === '') return 1;
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (normalised === 'true') return 1;
    if (normalised === 'false') return 0;
  }
  throw new ValidationError('isMandatory must be true or false');
}

function requireProcessType(value) {
  const processType = (value || 'NEW').toUpperCase();
  if (!PROCESS_TYPES.includes(processType)) {
    throw new ValidationError(`Process type must be one of: ${PROCESS_TYPES.join(', ')}`);
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

function validateDocument(data) {
  if (!data.documentName || !String(data.documentName).trim()) {
    throw new ValidationError('Document name is required');
  }
  if (String(data.documentName).length > MAX_NAME) {
    throw new ValidationError(`Document name must be ${MAX_NAME} characters or fewer`);
  }
  if (data.notes && String(data.notes).length > MAX_NOTES) {
    throw new ValidationError(`Notes must be ${MAX_NOTES} characters or fewer`);
  }
  if (data.sortOrder !== undefined && data.sortOrder !== null && data.sortOrder !== '') {
    const sortOrder = Number(data.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      throw new ValidationError('Sort order must be a whole number of 0 or more');
    }
  }
}

async function listDocuments(permitId, processType) {
  await requirePermit(permitId);
  const filter = processType ? requireProcessType(processType) : undefined;
  return (await permitDocumentRepository.findByPermit(permitId, filter)).map(toApiShape);
}

// Groups every checklist item under its process type, always returning all
// three keys so the frontend can render tabs without null checks.
async function listDocumentsGrouped(permitId) {
  const grouped = {};
  PROCESS_TYPES.forEach((type) => {
    grouped[type] = [];
  });
  (await permitDocumentRepository.findByPermit(permitId)).forEach((row) => {
    const doc = toApiShape(row);
    if (grouped[doc.processType]) {
      grouped[doc.processType].push(doc);
    }
  });
  return grouped;
}

async function getDocument(permitId, documentId) {
  await requirePermit(permitId);
  const row = await permitDocumentRepository.findById(documentId);
  if (!row || row.permit_id !== Number(permitId)) {
    throw new NotFoundError('Checklist document not found');
  }
  return toApiShape(row);
}

async function createDocument(permitId, data) {
  await requirePermit(permitId);
  const processType = requireProcessType(data.processType);
  validateDocument(data);
  const isMandatory = toMandatoryFlag(data.isMandatory);

  const sortOrder =
    data.sortOrder === undefined || data.sortOrder === null || data.sortOrder === ''
      ? (await permitDocumentRepository.maxSortOrder(permitId, processType)) + 1
      : Number(data.sortOrder);

  const row = await permitDocumentRepository.insert({
    permit_id: Number(permitId),
    process_type: processType,
    document_name: String(data.documentName).trim(),
    is_mandatory: isMandatory,
    notes: data.notes || null,
    sort_order: sortOrder,
  });
  return toApiShape(row);
}

async function updateDocument(permitId, documentId, data) {
  const existing = await getDocument(permitId, documentId);
  const processType = requireProcessType(data.processType || existing.processType);
  validateDocument(data);
  const isMandatory =
    data.isMandatory === undefined
      ? Number(existing.isMandatory)
      : toMandatoryFlag(data.isMandatory);

  const sortOrder =
    data.sortOrder === undefined || data.sortOrder === null || data.sortOrder === ''
      ? existing.sortOrder
      : Number(data.sortOrder);

  const row = await permitDocumentRepository.update(documentId, {
    process_type: processType,
    document_name: String(data.documentName).trim(),
    is_mandatory: isMandatory,
    notes: data.notes || null,
    sort_order: sortOrder,
  });
  return toApiShape(row);
}

async function deleteDocument(permitId, documentId) {
  await getDocument(permitId, documentId);
  await permitDocumentRepository.remove(documentId);
}

async function reorderDocuments(permitId, processTypeInput, documentIds) {
  await requirePermit(permitId);
  const processType = requireProcessType(processTypeInput);

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new ValidationError('documentIds must be a non-empty array of document ids');
  }

  const existingIds = (await permitDocumentRepository.findByPermit(permitId, processType))
    .map((row) => row.document_id);
  const requested = documentIds.map(Number);

  if (requested.some((id) => !Number.isInteger(id))) {
    throw new ValidationError('documentIds must contain only numeric document ids');
  }
  if (new Set(requested).size !== requested.length) {
    throw new ValidationError('documentIds must not contain duplicates');
  }
  if (
    requested.length !== existingIds.length ||
    requested.some((id) => !existingIds.includes(id))
  ) {
    throw new ValidationError(
      'documentIds must list every document in this process type exactly once'
    );
  }

  return (await permitDocumentRepository.reorder(permitId, processType, requested)).map(toApiShape);
}

module.exports = {
  PROCESS_TYPES,
  listDocuments,
  listDocumentsGrouped,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  reorderDocuments,
};
