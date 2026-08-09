const workPermitService = require('./workPermitService');
const sourceService = require('./permitSourceDocumentService');
const { extractDocumentText } = require('./permitDocumentTextService');
const { createPermitQuestionAnswerProvider, MISSING_ANSWER } = require('./permitQuestionAnswerProvider');
const { ValidationError, NotFoundError } = require('../utils/errors');

const PROCESS_LABELS = { NEW: 'New Application', RENEWAL: 'Renewal', CANCELLATION: 'Cancellation' };
const MAX_CONTEXT_CHARACTERS = 60_000;

function validateQuestion(value) {
  const question = String(value || '').trim();
  if (question.length < 3) throw new ValidationError('Enter a question with at least 3 characters');
  if (question.length > 500) throw new ValidationError('Question must be 500 characters or fewer');
  return question;
}

async function buildPermitContext(permitId) {
  const permit = await workPermitService.getPermitById(permitId);
  if (!permit) throw new NotFoundError('Work permit not found');
  const processes = Object.keys(PROCESS_LABELS).map((type) => ({
    type,
    label: PROCESS_LABELS[type],
    steps: permit.steps?.[type] || [],
    documents: permit.documents?.[type] || [],
  }));
  const citations = [
    { key: 'PERMIT_OVERVIEW', type: 'PERMIT_FIELD', label: 'Permit overview' },
    { key: 'ELIGIBILITY', type: 'PERMIT_FIELD', label: 'Eligibility criteria' },
    ...processes.flatMap((process) => [
      { key: `PROCESS_${process.type}`, type: 'PROCESS_STEPS', processType: process.type, label: `${process.label} process` },
      { key: `DOCUMENTS_${process.type}`, type: 'PROCESS_DOCUMENTS', processType: process.type, label: `Required Documents — ${process.label}` },
    ]),
  ];
  const sourceDocuments = [];
  let remaining = MAX_CONTEXT_CHARACTERS;
  for (const source of await sourceService.listSourceDocuments(permit.id, { includeArchived: false })) {
    let text = '';
    if (remaining > 0) {
      try {
        const target = await sourceService.getDownloadTarget(permit.id, source.id);
        text = (await extractDocumentText(target.filePath, target.mimeType)).text.slice(0, remaining);
        remaining -= text.length;
      } catch {
        // Metadata is still useful evidence when an old file can no longer be parsed.
      }
    }
    sourceDocuments.push({ id: source.id, fileName: source.fileName, sourceType: source.sourceType, description: source.description, text });
    citations.push({ key: `SOURCE_${source.id}`, type: 'SOURCE_DOCUMENT', sourceDocumentId: source.id, label: source.fileName });
  }
  return {
    permit: {
      id: permit.id, title: permit.title, permitType: permit.permitType, countryCode: permit.countryCode,
      status: permit.status, description: permit.description, eligibilityCriteria: permit.eligibilityCriteria,
      processingTimeDays: permit.processingTimeDays, validityMonths: permit.validityMonths,
      governmentFee: permit.governmentFee, currencyCode: permit.currencyCode, workerType: permit.workerType,
      informationStatus: permit.informationStatus,
    },
    processes,
    sourceDocuments,
    citations,
  };
}

async function askPermit(permitId, questionInput, { provider } = {}) {
  const question = validateQuestion(questionInput);
  const context = await buildPermitContext(permitId);
  const selectedProvider = provider || createPermitQuestionAnswerProvider();
  const response = await selectedProvider.answer(question, context);
  const answer = String(response?.answer || '').trim() || MISSING_ANSWER;
  const allowed = new Map(context.citations.map((item) => [item.key, item]));
  const citationKeys = Array.isArray(response?.citationKeys) ? response.citationKeys : [];
  const citations = [...new Set(citationKeys)].map((key) => allowed.get(key)).filter(Boolean);
  return { answer, citations, providerMode: selectedProvider.mode };
}

module.exports = { MAX_CONTEXT_CHARACTERS, validateQuestion, buildPermitContext, askPermit };
