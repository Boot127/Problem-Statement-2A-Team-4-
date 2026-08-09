const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');
const workPermitService = require('./workPermitService');
const sourceDocumentService = require('./permitSourceDocumentService');
const { ValidationError, NotFoundError } = require('../utils/errors');

const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];
const PROCESS_LABELS = { NEW: 'NEW APPLICATION', RENEWAL: 'RENEWAL', CANCELLATION: 'CANCELLATION' };
const WORKER_LABELS = { LOCAL_EMPLOYEE: 'Local Employee', FOREIGN_WORKER: 'Foreign Worker', EXPATRIATE: 'Expatriate' };
const VISIBILITY_LABELS = { INTERNAL_STAFF: 'Internal Staff', CLIENT_SHAREABLE: 'Client Shareable', COMPLIANCE_ONLY: 'Compliance Only' };
const SOURCE_LABELS = { OFFICIAL_GUIDE: 'Official Government Guide', LEGISLATION: 'Legislation', FORM: 'Application Form', CIRCULAR: 'Circular or Notice', INTERNAL_NOTE: 'Internal Note', OTHER: 'Other' };
const COUNTRY_LABELS = { HK: 'Hong Kong', IN: 'India', ID: 'Indonesia', JP: 'Japan', MY: 'Malaysia', PH: 'Philippines', SG: 'Singapore', KR: 'South Korea', TH: 'Thailand', VN: 'Vietnam', MM: 'Myanmar', AU: 'Australia', NZ: 'New Zealand' };

function requireId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid permit id');
  return id;
}

function value(value, fallback = 'Not recorded') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function safeFileName(title) {
  const safe = String(title || 'work-permit')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]/g, '-')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'work-permit';
  return `${safe} - Permit Guide.docx`;
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 280, after: 120 }, children: [new TextRun(text)] });
}

function prose(text, fallback) {
  const content = value(text, fallback);
  return content.split(/\r?\n/).map((line) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun(line || ' ')] }));
}

function factCell(label, text) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), bold: true, color: '315B7D', size: 18 })] }),
      new Paragraph({ spacing: { before: 50 }, children: [new TextRun(value(text))] }),
    ],
  });
}

function factsTable(facts) {
  const rows = [];
  for (let index = 0; index < facts.length; index += 2) {
    rows.push(new TableRow({ children: [factCell(...facts[index]), factCell(...(facts[index + 1] || ['', '']))] }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function processSection(permit, processType, index) {
  const steps = permit.steps?.[processType] || [];
  const documents = permit.documents?.[processType] || [];
  const blocks = [];
  if (index > 0) blocks.push(new Paragraph({ children: [new PageBreak()] }));
  blocks.push(heading(PROCESS_LABELS[processType]));
  blocks.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `${steps.length} steps • ${documents.length} required documents`, bold: true, color: '315B7D' })] }));
  blocks.push(heading('Process Steps', HeadingLevel.HEADING_2));
  if (!steps.length) blocks.push(new Paragraph({ children: [new TextRun({ text: 'No process steps recorded.', italics: true, color: '666666' })] }));
  steps.forEach((step, stepIndex) => {
    blocks.push(new Paragraph({ spacing: { before: 130, after: 50 }, keepNext: true, children: [new TextRun({ text: `${stepIndex + 1}. ${step.stepTitle}`, bold: true })] }));
    if (step.stepDetail) blocks.push(...prose(step.stepDetail));
    if (step.expectedTimeline) blocks.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Expected timeline: ', bold: true, color: '315B7D' }), new TextRun(step.expectedTimeline)] }));
  });
  blocks.push(heading('Required Documents', HeadingLevel.HEADING_2));
  if (!documents.length) blocks.push(new Paragraph({ children: [new TextRun({ text: 'No required-document checklist recorded.', italics: true, color: '666666' })] }));
  documents.forEach((document) => {
    blocks.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: `${document.documentName} — `, bold: true }), new TextRun({ text: document.isMandatory ? 'Mandatory' : 'Optional', bold: true, color: document.isMandatory ? 'A61B1B' : '52606D' }), ...(document.notes ? [new TextRun(` — ${document.notes}`)] : [])] }));
  });
  return blocks;
}

async function generateGuide(permitIdInput) {
  const permitId = requireId(permitIdInput);
  const permit = await workPermitService.getPermitById(permitId);
  if (!permit) throw new NotFoundError('Work permit not found');
  const sources = await sourceDocumentService.listSourceDocuments(permitId, { includeArchived: false });
  const clientShareable = permit.visibility === 'CLIENT_SHAREABLE';
  const fee = permit.governmentFee === null || permit.governmentFee === undefined
    ? 'Not recorded'
    : `${permit.currencyCode || ''} ${permit.governmentFee}`.trim();
  const facts = [
    ['Country', COUNTRY_LABELS[permit.countryCode] || permit.countryCode],
    ['Permit type', permit.permitType],
    ['Worker type', WORKER_LABELS[permit.workerType] || permit.workerType],
    ['Status', permit.status],
    ['Visibility', VISIBILITY_LABELS[permit.visibility] || permit.visibility],
    ['Processing time', permit.processingTimeDays === null ? 'Not recorded' : `${permit.processingTimeDays} days`],
    ['Validity', permit.validityMonths === null ? 'Not recorded' : `${permit.validityMonths} months`],
    ['Government fee', fee],
    ['Information health', `${permit.health?.completeness ?? 0}% complete — ${value(permit.health?.reviewState).replaceAll('_', ' ')}`],
    ['Last reviewed', value(permit.lastReviewedAt)],
    ['Next review', value(permit.nextReviewAt, 'Not scheduled')],
    ['Version', permit.version],
  ];

  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'WORK PERMIT GUIDE', bold: true, color: '315B7D', size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: permit.title, bold: true, size: 34 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: clientShareable ? 'CLIENT SHAREABLE — verify against current official sources before distribution.' : 'INTERNAL GUIDE ONLY — not approved for external distribution.', bold: true, color: clientShareable ? '18794E' : 'A15C00' })] }),
    factsTable(facts),
    heading('Overview'),
    ...prose(permit.description, 'No description recorded.'),
    heading('Eligibility'),
    ...prose(permit.eligibilityCriteria, 'No eligibility criteria recorded.'),
    ...PROCESS_TYPES.flatMap((type, index) => processSection(permit, type, index)),
    new Paragraph({ children: [new PageBreak()] }),
    heading('SOURCE EVIDENCE'),
  ];

  if (permit.sourceUrl) children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Official source URL: ', bold: true }), new TextRun(permit.sourceUrl)] }));
  if (sources.length) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Source', 'Type', 'Uploaded', 'Uploaded by', 'Notes'].map((text) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: 'DCEAF5' }, children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })) }),
        ...sources.map((source) => new TableRow({ children: [source.fileName, SOURCE_LABELS[source.sourceType] || source.sourceType, value(source.uploadedAt), value(source.uploadedBy, '—'), value(source.description, '—')].map((text) => new TableCell({ children: [new Paragraph(String(text))] })) })),
      ],
    }));
  } else if (!permit.sourceUrl) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'No active source evidence recorded.', italics: true, color: '666666' })] }));
  }
  children.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'B8C4CE' } }, spacing: { before: 360 }, children: [new TextRun({ text: 'Disclaimer: This guide is a reference and is not legal advice. Immigration requirements and fees may change. Verify against the latest official source before acting or sharing externally.', italics: true, color: '52606D', size: 18 })] }));

  const document = new Document({
    creator: 'HR Compliance Knowledge Management Platform',
    title: `${permit.title} Permit Guide`,
    description: 'Generated Work Permit guide',
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children }],
    styles: { default: { document: { run: { font: 'Aptos', size: 22 }, paragraph: { spacing: { line: 276 } } } } },
  });
  return { buffer: await Packer.toBuffer(document), fileName: safeFileName(permit.title) };
}

module.exports = { generateGuide, safeFileName };
