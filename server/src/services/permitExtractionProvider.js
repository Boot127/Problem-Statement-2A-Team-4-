const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];
const { getPermitAiConfig, requestStructured } = require('./permitAiClient');

const SCALAR_FIELDS = [
  'countryCode',
  'permitType',
  'title',
  'description',
  'eligibilityCriteria',
  'processingTimeDays',
  'validityMonths',
  'governmentFee',
  'currencyCode',
  'workerType',
];

const FIELD_SCHEMA = Object.fromEntries(
  SCALAR_FIELDS.map((field) => [
    field,
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        value: field === 'processingTimeDays' || field === 'validityMonths' || field === 'governmentFee'
          ? { type: ['number', 'null'] }
          : { type: ['string', 'null'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      },
      required: ['value', 'confidence']
    }
  ])
);

const PROCESS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          processType: { type: 'string', enum: PROCESS_TYPES },
          stepNumber: { type: 'integer', minimum: 1 },
          stepTitle: { type: 'string' },
          stepDetail: { type: 'string' },
          expectedTimeline: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['processType', 'stepNumber', 'stepTitle', 'stepDetail', 'expectedTimeline', 'confidence']
      }
    },
    documents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          processType: { type: 'string', enum: PROCESS_TYPES },
          documentName: { type: 'string' },
          isMandatory: { type: 'boolean' },
          notes: { type: 'string' },
          sortOrder: { type: 'integer', minimum: 1 },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['processType', 'documentName', 'isMandatory', 'notes', 'sortOrder', 'confidence']
      }
    }
  },
  required: ['steps', 'documents']
};

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fields: {
      type: 'object',
      additionalProperties: false,
      properties: FIELD_SCHEMA,
      required: SCALAR_FIELDS
    },
    processes: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(PROCESS_TYPES.map((type) => [type, PROCESS_SCHEMA])),
      required: PROCESS_TYPES
    },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['fields', 'processes', 'warnings']
};

function confidence(value, fallback = 0.65) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function emptyProcesses() {
  return Object.fromEntries(PROCESS_TYPES.map((type) => [type, { steps: [], documents: [] }]));
}

function suggestion(value, score = 0.65) {
  return value === undefined || value === null || value === ''
    ? { value: null, confidence: 0 }
    : { value, confidence: confidence(score) };
}

function inferMockFields(text, currentPermit = {}) {
  const valueAfterLabel = (label, stopLabels) => {
    const escapedStops = stopLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const match = text.match(new RegExp(`${label}\\s*([\\s\\S]*?)(?=${escapedStops}|$)`, 'i'));
    return match?.[1]?.trim().replace(/\s+/g, ' ') || null;
  };
  const numeric = (pattern) => {
    const match = text.match(pattern);
    return match ? Number(match[1].replace(/,/g, '')) : null;
  };
  const workerMatch = text.match(/Worker Type\s*(Local|Foreign Worker|Expatriate|All Employees)/i);
  const workerTypes = {
    local: 'LOCAL',
    'foreign worker': 'FOREIGN_WORKER',
    expatriate: 'EXPATRIATE',
    'all employees': 'ALL_EMPLOYEES'
  };
  const country = valueAfterLabel('Country', ['Permit Name', 'Worker Type']);
  const permitName = valueAfterLabel('Permit Name', ['Worker Type', 'Status']);
  const eligibility = valueAfterLabel('Eligibility Summary', ['New Application Process', 'Renewal Process', 'Cancellation Process']);
  const countryCodes = { singapore: 'SG', malaysia: 'MY', indonesia: 'ID', thailand: 'TH', philippines: 'PH', vietnam: 'VN' };

  return {
    countryCode: suggestion(countryCodes[country?.toLowerCase()] || currentPermit.countryCode, country ? 0.92 : 0.35),
    permitType: suggestion(permitName || currentPermit.permitType, permitName ? 0.92 : 0.35),
    title: suggestion(country && permitName ? `${country} ${permitName}` : currentPermit.title, country && permitName ? 0.88 : 0.35),
    description: suggestion(null),
    eligibilityCriteria: suggestion(eligibility, 0.78),
    processingTimeDays: suggestion(numeric(/Processing Time[^\d]{0,40}(\d+(?:\.\d+)?)/i), 0.82),
    validityMonths: suggestion(numeric(/Validity[^\d]{0,40}(\d+(?:\.\d+)?)/i), 0.82),
    governmentFee: suggestion(numeric(/Government Fee[^\d]{0,50}(\d+(?:[,.]\d+)?)/i), 0.8),
    currencyCode: suggestion(text.match(/Government Fee\s*([A-Z]{3})/i)?.[1]?.toUpperCase(), 0.8),
    workerType: suggestion(workerMatch ? workerTypes[workerMatch[1].toLowerCase()] : currentPermit.workerType, workerMatch ? 0.9 : 0.35),
  };
}

function getProcessSections(text) {
  const headings = [
    { type: 'NEW', pattern: /New Application Process/i },
    { type: 'RENEWAL', pattern: /Renewal Process/i },
    { type: 'CANCELLATION', pattern: /Cancellation Process/i }
  ];
  const located = headings
    .map((heading) => ({ ...heading, index: text.search(heading.pattern) }))
    .filter((heading) => heading.index >= 0)
    .sort((a, b) => a.index - b.index);

  return located.map((heading, index) => ({
    type: heading.type,
    text: text.slice(heading.index, located[index + 1]?.index ?? text.length)
  }));
}

function parseMockSteps(processType, sectionText) {
  const processOnly = sectionText.split(/Required Documents/i)[0];
  const matches = [...processOnly.matchAll(/Step\s+(\d+)\s*[-:]\s*([^\n\r]+)([\s\S]*?)(?=Step\s+\d+\s*[-:]|$)/gi)];

  return matches.map((match) => {
    const stepNumber = Number(match[1]);
    const headingAndBody = `${match[2]} ${match[3]}`.replace(/\s+/g, ' ').trim();
    const timelineMatch = headingAndBody.match(/(?:Expected timeline:\s*|Review period is\s*)([^.]+(?:\.)?)/i);
    const withoutTimeline = timelineMatch
      ? headingAndBody.replace(timelineMatch[0], '').trim()
      : headingAndBody;
    const firstSentenceEnd = withoutTimeline.indexOf('.');
    const stepTitle = (firstSentenceEnd >= 0 ? withoutTimeline.slice(0, firstSentenceEnd) : withoutTimeline).trim();
    const stepDetail = firstSentenceEnd >= 0 ? withoutTimeline.slice(firstSentenceEnd + 1).trim() : '';

    return {
      processType,
      stepNumber,
      stepTitle,
      stepDetail,
      expectedTimeline: timelineMatch?.[1]?.replace(/\.$/, '').trim() || '',
      confidence: 0.86
    };
  });
}

function parseMockDocuments(processType, sectionText) {
  const documentPart = sectionText
    .split(/Required Documents/i)[1]
    ?.split(/Source and Review Information/i)[0];
  if (!documentPart) return [];

  const rows = documentPart
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const documents = [];

  for (const row of rows) {
    if (/^Document\s*Mandatory\s*Notes$/i.test(row) || /^Source Document Information/i.test(row)) continue;
    // PDF table cells are concatenated (for example "PassportYesNotes").
    // Keep this case-sensitive so words such as "acknowledgement" do not
    // accidentally match the lower-case letters "no".
    const match = row.match(/^(.+?)(Yes|No)(.*)$/);
    if (!match) continue;
    documents.push({
      processType,
      documentName: match[1].trim(),
      isMandatory: match[2].toLowerCase() === 'yes',
      notes: match[3].trim(),
      sortOrder: documents.length + 1,
      confidence: 0.84
    });
  }
  return documents;
}

function mockExtract({ text, currentPermit }) {
  const processes = emptyProcesses();
  getProcessSections(text).forEach((section) => {
    processes[section.type] = {
      steps: parseMockSteps(section.type, section.text),
      documents: parseMockDocuments(section.type, section.text)
    };
  });

  return {
    fields: inferMockFields(text, currentPermit),
    processes,
    warnings: ['Mock extraction mode was used. Verify every suggestion against the source document.']
  };
}

function normaliseStep(item, expectedType, index) {
  if (!item || !String(item.stepTitle || item.title || '').trim()) return null;
  const processType = String(item.processType || expectedType || '').toUpperCase();
  if (!PROCESS_TYPES.includes(processType) || (expectedType && processType !== expectedType)) return null;
  const stepNumber = Number(item.stepNumber);
  return {
    processType,
    stepNumber: Number.isInteger(stepNumber) && stepNumber > 0 ? stepNumber : index + 1,
    stepTitle: String(item.stepTitle || item.title).trim(),
    stepDetail: String(item.stepDetail || item.detail || '').trim(),
    expectedTimeline: String(item.expectedTimeline || item.timeline || '').trim(),
    confidence: confidence(item.confidence)
  };
}

function normaliseDocument(item, expectedType, index) {
  if (!item || !String(item.documentName || item.name || '').trim()) return null;
  const processType = String(item.processType || expectedType || '').toUpperCase();
  if (!PROCESS_TYPES.includes(processType) || (expectedType && processType !== expectedType)) return null;
  const sortOrder = Number(item.sortOrder);
  return {
    processType,
    documentName: String(item.documentName || item.name).trim(),
    isMandatory: item.isMandatory === true || String(item.isMandatory).toLowerCase() === 'true',
    notes: String(item.notes || '').trim(),
    sortOrder: Number.isInteger(sortOrder) && sortOrder > 0 ? sortOrder : index + 1,
    confidence: confidence(item.confidence)
  };
}

function normaliseProviderResult(raw = {}) {
  const fields = {};
  for (const field of SCALAR_FIELDS) {
    const candidate = raw.fields?.[field];
    fields[field] = candidate && typeof candidate === 'object' && Object.hasOwn(candidate, 'value')
      ? { value: candidate.value, confidence: confidence(candidate.confidence) }
      : suggestion(candidate, 0.55);
  }

  const processes = emptyProcesses();
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map(String) : [];
  const hasGroupedProcesses = raw.processes && typeof raw.processes === 'object';

  for (const type of PROCESS_TYPES) {
    const sourceSteps = hasGroupedProcesses
      ? raw.processes[type]?.steps
      : (Array.isArray(raw.steps) ? raw.steps.filter((item) => String(item.processType).toUpperCase() === type) : []);
    const sourceDocuments = hasGroupedProcesses
      ? raw.processes[type]?.documents
      : (Array.isArray(raw.documents) ? raw.documents.filter((item) => String(item.processType).toUpperCase() === type) : []);

    processes[type].steps = (Array.isArray(sourceSteps) ? sourceSteps : [])
      .map((item, index) => normaliseStep(item, type, index))
      .filter(Boolean)
      .sort((a, b) => a.stepNumber - b.stepNumber);
    processes[type].documents = (Array.isArray(sourceDocuments) ? sourceDocuments : [])
      .map((item, index) => normaliseDocument(item, type, index))
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return {
    fields,
    processes,
    steps: PROCESS_TYPES.flatMap((type) => processes[type].steps),
    documents: PROCESS_TYPES.flatMap((type) => processes[type].documents),
    warnings
  };
}

function buildExtractionPrompt({ text, currentPermit }) {
  return [
    'Extract structured work-permit information from the SOURCE DOCUMENT below.',
    'The document may contain three independent process sections: NEW (New Application), RENEWAL, and CANCELLATION.',
    'Keep each section separate. Never assign a step or document to a process merely because another process mentions it.',
    'For every step return processType, stepNumber, stepTitle, stepDetail, expectedTimeline, and confidence.',
    'For every required document return processType, documentName, isMandatory, notes, sortOrder, and confidence.',
    'Preserve the document order. Use sequential positive integers for stepNumber and sortOrder.',
    'If a timeline or note is absent, return an empty string. If a scalar field is absent, return null with confidence 0.',
    'If a process is not explicitly described, its steps and documents arrays MUST be empty. Do not infer or invent missing processes.',
    'CURRENT RECORD is context for naming only and is not evidence. Do not copy from it unless the source document supports the value.',
    `CURRENT RECORD:\n${JSON.stringify(currentPermit || {})}`,
    `SOURCE DOCUMENT:\n${text}`
  ].join('\n\n');
}

async function compatibleExtract({ text, currentPermit, config }) {
  return requestStructured({
    system: 'You extract only facts explicitly present in work-permit source documents and return schema-valid JSON.',
    prompt: buildExtractionPrompt({ text, currentPermit }),
    schema: EXTRACTION_SCHEMA,
    schemaName: 'work_permit_extraction',
    featureLabel: 'Extraction',
  });
}

function getProviderConfig() {
  return getPermitAiConfig();
}

function createPermitExtractionProvider() {
  const config = getProviderConfig();
  if (config.provider === 'mock') {
    return {
      mode: 'mock',
      extract: async (text, currentPermit) => normaliseProviderResult(mockExtract({ text, currentPermit }))
    };
  }
  if (config.provider === 'compatible') {
    return {
      mode: 'live',
      extract: async (text, currentPermit) => normaliseProviderResult(await compatibleExtract({ text, currentPermit, config }))
    };
  }
  const error = new Error(`Unsupported permit extraction provider: ${config.provider}`);
  error.status = 503;
  throw error;
}

module.exports = {
  PROCESS_TYPES,
  SCALAR_FIELDS,
  createPermitExtractionProvider,
  getProviderConfig,
  normaliseProviderResult
};
