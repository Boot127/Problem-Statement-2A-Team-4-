const db = require('../config/database');
const workPermitService = require('./workPermitService');
const permitStepService = require('./permitStepService');
const permitDocumentService = require('./permitDocumentService');
const sourceService = require('./permitSourceDocumentService');
const { extractDocumentText } = require('./permitDocumentTextService');
const { createPermitExtractionProvider, SCALAR_FIELDS, PROCESS_TYPES } = require('./permitExtractionProvider');
const { ValidationError } = require('../utils/errors');

const NUMERIC_FIELDS = new Set(['processingTimeDays', 'validityMonths', 'governmentFee']);

async function extractFromSourceDocument(permitId, documentId, { provider } = {}) {
  const permit = await workPermitService.getPermitById(permitId);
  if (!permit) throw new ValidationError('Work permit not found');
  const source = await sourceService.getSourceDocument(permitId, documentId);
  if (source.status !== 'ACTIVE') throw new ValidationError('Restore this source document before extracting it');
  const target = await sourceService.getDownloadTarget(permitId, documentId);
  const extracted = await extractDocumentText(target.filePath, target.mimeType);
  const selectedProvider = provider || createPermitExtractionProvider();
  const suggestions = await selectedProvider.extract(extracted.text, permit);
  return {
    providerMode: selectedProvider.mode,
    sourceDocument: source,
    extractedCharacters: extracted.text.length,
    textTruncated: extracted.truncated,
    suggestions,
  };
}

function cleanReviewedFields(fields = {}) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new ValidationError('Reviewed fields must be an object');
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([key]) => SCALAR_FIELDS.includes(key))
      .map(([key, value]) => [key, NUMERIC_FIELDS.has(key) && value !== '' ? Number(value) : typeof value === 'string' ? value.trim() : value])
  );
}

function cleanReviewedSteps(steps = []) {
  if (!Array.isArray(steps)) throw new ValidationError('Reviewed steps must be an array');
  return steps.map((step, index) => {
    if (!PROCESS_TYPES.includes(step.processType)) throw new ValidationError('An extracted step has an invalid process type');
    if (!String(step.stepTitle || '').trim()) throw new ValidationError('Every selected step needs a title');
    const stepNumber = Number(step.stepNumber);
    return {
      processType: step.processType,
      stepNumber: Number.isInteger(stepNumber) && stepNumber > 0 ? stepNumber : index + 1,
      stepTitle: String(step.stepTitle).trim(),
      stepDetail: String(step.stepDetail || '').trim(),
      expectedTimeline: String(step.expectedTimeline || '').trim()
    };
  }).sort((a, b) => PROCESS_TYPES.indexOf(a.processType) - PROCESS_TYPES.indexOf(b.processType) || a.stepNumber - b.stepNumber);
}

function cleanReviewedDocuments(documents = []) {
  if (!Array.isArray(documents)) throw new ValidationError('Reviewed documents must be an array');
  return documents.map((document, index) => {
    if (!PROCESS_TYPES.includes(document.processType)) throw new ValidationError('An extracted document has an invalid process type');
    if (!String(document.documentName || '').trim()) throw new ValidationError('Every selected document needs a name');
    const sortOrder = Number(document.sortOrder);
    return {
      processType: document.processType,
      documentName: String(document.documentName).trim(),
      isMandatory: document.isMandatory !== false,
      notes: String(document.notes || '').trim(),
      sortOrder: Number.isInteger(sortOrder) && sortOrder > 0 ? sortOrder : index + 1
    };
  }).sort((a, b) => PROCESS_TYPES.indexOf(a.processType) - PROCESS_TYPES.indexOf(b.processType) || a.sortOrder - b.sortOrder);
}

async function applyReviewedExtraction(permitId, documentId, payload = {}) {
  const existing = await workPermitService.getPermitById(permitId);
  if (!existing) throw new ValidationError('Work permit not found');
  const source = await sourceService.getSourceDocument(permitId, documentId);
  if (source.status !== 'ACTIVE') throw new ValidationError('Restore this source document before using its extraction');
  const fields = cleanReviewedFields(payload.fields);
  const steps = cleanReviewedSteps(payload.steps || []);
  const documents = cleanReviewedDocuments(payload.documents || []);
  const merged = { ...existing, ...fields, status: 'DRAFT' };
  const duplicates = await workPermitService.findDuplicates({ countryCode: merged.countryCode, permitType: merged.permitType, excludeId: permitId });
  if (duplicates.length) throw new ValidationError(`The reviewed fields duplicate "${duplicates[0].title}"`);

  const marker = `AI-assisted draft from ${source.fileName}: ${Object.keys(fields).join(', ') || 'process items only'}`;
  merged.reviewNotes = [existing.reviewNotes, marker].filter(Boolean).join('\n').slice(0, 1000);

  await db.transaction(async () => {
    await workPermitService.updatePermit(permitId, merged);
    // Append in the reviewed extraction order. Omitting the source sequence
    // number prevents collisions when a permit already contains process items.
    for (const { stepNumber: _stepNumber, ...step } of steps) await permitStepService.createStep(permitId, step);
    for (const { sortOrder: _sortOrder, ...document } of documents) await permitDocumentService.createDocument(permitId, document);
  });
  return { permit: await workPermitService.getPermitById(permitId), applied: { fields: Object.keys(fields), steps: steps.length, documents: documents.length }, sourceDocumentId: source.id, forcedStatus: 'DRAFT' };
}

module.exports = { cleanReviewedFields, cleanReviewedSteps, cleanReviewedDocuments, extractFromSourceDocument, applyReviewedExtraction };
