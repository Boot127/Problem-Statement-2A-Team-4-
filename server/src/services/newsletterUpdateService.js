// Dev 4 — business logic for newsletters + detected_updates (upload,
// AI summarisation, human review decision). Controllers stay thin and call
// into this; this is where validation/orchestration lives, matching the
// controller -> service -> repository layering used elsewhere (see
// reviewWorkflowService.js).

const fs = require('fs/promises');
const path = require('path');

const newsletterRepository = require('../repositories/newsletterRepository');
const { analyseNewsletterText } = require('./newsletterAiService');

const VALID_STATUSES = new Set(['pending', 'reviewed', 'archived']);
const VALID_DECISIONS = new Set(['confirmed', 'dismissed']);

function normaliseBody(body = {}) {
  return {
    title: typeof body.title === 'string' ? body.title.trim() : '',
    country: typeof body.country === 'string' ? body.country.trim() : '',
    source: typeof body.source === 'string' ? body.source.trim() : '',
    published_date: typeof body.published_date === 'string' ? body.published_date.trim() : '',
    status: typeof body.status === 'string' ? body.status.trim() : 'pending',
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
  };
}

function validateNewsletter(data) {
  const errors = [];

  if (!data.title) errors.push('Title is required.');
  if (!data.country) errors.push('Country is required.');
  if (!VALID_STATUSES.has(data.status)) errors.push('Status must be pending, reviewed, or archived.');
  if (data.published_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.published_date)) {
    errors.push('Published date must use YYYY-MM-DD format.');
  }

  return errors;
}

function list(query) {
  return newsletterRepository.listNewsletters({
    search: query.search,
    country: query.country,
    status: query.status,
  });
}

function getById(id) {
  return newsletterRepository.getNewsletterById(id);
}

function create(body) {
  const data = normaliseBody(body);
  const errors = validateNewsletter(data);
  if (errors.length > 0) {
    const err = new Error('Validation failed.');
    err.status = 400;
    err.details = errors;
    throw err;
  }
  return newsletterRepository.createNewsletter(data);
}

function update(id, body) {
  const existing = newsletterRepository.getNewsletterById(id);
  if (!existing) return null;

  const incoming = normaliseBody(body);
  const data = {
    title: incoming.title || existing.title,
    country: incoming.country || existing.country,
    source: incoming.source,
    published_date: incoming.published_date,
    status: incoming.status || existing.status,
    notes: incoming.notes,
  };

  const errors = validateNewsletter(data);
  if (errors.length > 0) {
    const err = new Error('Validation failed.');
    err.status = 400;
    err.details = errors;
    throw err;
  }

  return newsletterRepository.updateNewsletter(id, data);
}

function remove(id) {
  return newsletterRepository.softDeleteNewsletter(id);
}

// --- C1: upload the source document for a newsletter -----------------------
function attachFile(id, file) {
  const existing = newsletterRepository.getNewsletterById(id);
  if (!existing) return null;

  return newsletterRepository.attachFile(id, {
    fileName: file.originalname,
    filePath: file.path,
  });
}

// --- AI summarisation + relevance flagging ---------------------------------
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    const content = await fs.readFile(filePath, 'utf8');
    return { text: content, unsupported: false };
  }

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return { text: parsed.text, unsupported: false };
  }

  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return { text: result.value, unsupported: false };
  }

  return {
    text: null,
    unsupported: true,
    reason: `Automatic text extraction is not supported for "${ext}" files yet. Supported: .txt, .pdf, .docx.`,
  };
}

async function summarize(id) {
  const newsletter = newsletterRepository.getNewsletterById(id);
  if (!newsletter) return null;

  let sourceText = '';
  let extractionNote = null;

  if (newsletter.file_path) {
    const extracted = await extractText(newsletter.file_path);
    if (extracted.unsupported) {
      extractionNote = extracted.reason;
    } else {
      sourceText = extracted.text || '';
    }
  }

  // Fall back to the manually entered title/notes when there is no file, or
  // the file type can't be parsed, so the feature still works end to end.
  if (!sourceText.trim()) {
    sourceText = [newsletter.title, newsletter.notes].filter(Boolean).join('. ');
  }

  if (!sourceText.trim()) {
    const err = new Error('Nothing to summarise yet. Upload a .txt/.pdf/.docx file or add notes first.');
    err.status = 400;
    throw err;
  }

  const result = await analyseNewsletterText(sourceText);
  const detectedUpdate = newsletterRepository.upsertAiResult(id, result);

  return {
    newsletter: newsletterRepository.getNewsletterById(id),
    detectedUpdate,
    extractionNote,
  };
}

// --- Human-in-the-loop confirm/dismiss of an AI-flagged update -------------
function review(id, body) {
  const newsletter = newsletterRepository.getNewsletterById(id);
  if (!newsletter) return null;

  const decision = String(body?.decision || '').trim();
  const linkedComplianceArea = String(body?.linked_compliance_area || '').trim();

  if (!VALID_DECISIONS.has(decision)) {
    const err = new Error('decision must be "confirmed" or "dismissed".');
    err.status = 400;
    throw err;
  }

  if (decision === 'confirmed' && !linkedComplianceArea) {
    const err = new Error('linked_compliance_area is required to confirm an update, so it can be tied to an existing compliance record.');
    err.status = 400;
    throw err;
  }

  const detectedUpdate = newsletterRepository.setReviewDecision(id, {
    decision,
    linkedComplianceArea: linkedComplianceArea || null,
  });

  if (!detectedUpdate) {
    const err = new Error('Run AI summarisation on this newsletter before reviewing it.');
    err.status = 400;
    throw err;
  }

  return {
    newsletter: newsletterRepository.getNewsletterById(id),
    detectedUpdate,
  };
}

module.exports = { list, getById, create, update, remove, attachFile, summarize, review };
