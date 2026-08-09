const { getPermitAiConfig, requestStructured } = require('./permitAiClient');

const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    citationKeys: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'citationKeys'],
};

const MISSING_ANSWER = 'This information is not currently recorded for this permit.';

function processFromQuestion(question) {
  if (/renew/i.test(question)) return 'RENEWAL';
  if (/cancel|termination/i.test(question)) return 'CANCELLATION';
  if (/new|initial|application/i.test(question)) return 'NEW';
  return null;
}

function mockAnswer(question, context) {
  const processType = processFromQuestion(question);
  if (/eligib|qualif|salary/i.test(question)) {
    return context.permit.eligibilityCriteria
      ? { answer: context.permit.eligibilityCriteria, citationKeys: ['ELIGIBILITY'] }
      : { answer: MISSING_ANSWER, citationKeys: [] };
  }
  if (/fee|cost|price/i.test(question)) {
    const permit = context.permit;
    return permit.governmentFee !== null && permit.governmentFee !== undefined
      ? { answer: `The recorded government fee is ${permit.currencyCode || ''} ${permit.governmentFee}.`.replace(/\s+/g, ' ').trim(), citationKeys: ['PERMIT_OVERVIEW'] }
      : { answer: MISSING_ANSWER, citationKeys: [] };
  }
  if (/incomplete|missing.*process/i.test(question)) {
    const missing = context.processes.filter((process) => !process.steps.length || !process.documents.length);
    return missing.length
      ? { answer: `Incomplete process information: ${missing.map((item) => `${item.label} (${!item.steps.length ? 'no steps' : ''}${!item.steps.length && !item.documents.length ? ', ' : ''}${!item.documents.length ? 'no documents' : ''})`).join('; ')}.`, citationKeys: missing.flatMap((item) => [`PROCESS_${item.type}`, `DOCUMENTS_${item.type}`]) }
      : { answer: 'New Application, Renewal, and Cancellation each have recorded steps and required documents.', citationKeys: context.processes.flatMap((item) => [`PROCESS_${item.type}`, `DOCUMENTS_${item.type}`]) };
  }
  if (processType && /document|checklist|required/i.test(question)) {
    const process = context.processes.find((item) => item.type === processType);
    if (!process?.documents.length) return { answer: MISSING_ANSWER, citationKeys: [] };
    return {
      answer: `${process.label} currently lists ${process.documents.length} document${process.documents.length === 1 ? '' : 's'}: ${process.documents.map((item) => `${item.documentName} (${item.isMandatory ? 'Mandatory' : 'Optional'})`).join(', ')}.`,
      citationKeys: [`DOCUMENTS_${processType}`],
    };
  }
  if (processType && /how long|timeline|take|process|happen|step/i.test(question)) {
    const process = context.processes.find((item) => item.type === processType);
    if (!process?.steps.length) return { answer: MISSING_ANSWER, citationKeys: [] };
    return {
      answer: `${process.label} has ${process.steps.length} recorded steps: ${process.steps.map((item) => `${item.stepNumber}. ${item.stepTitle}${item.expectedTimeline ? ` (${item.expectedTimeline})` : ''}`).join('; ')}.`,
      citationKeys: [`PROCESS_${processType}`],
    };
  }
  return { answer: MISSING_ANSWER, citationKeys: [] };
}

function buildPrompt(question, context) {
  return [
    `QUESTION:\n${question}`,
    `ALLOWED CITATION KEYS:\n${context.citations.map((item) => `${item.key}: ${item.label}`).join('\n')}`,
    `WORK PERMIT CONTEXT:\n${JSON.stringify({ permit: context.permit, processes: context.processes, sourceDocuments: context.sourceDocuments })}`,
    'Return a concise operational answer and only citation keys from the allowed list. If the answer is absent, use the exact missing-information sentence from the system instruction.',
  ].join('\n\n');
}

function createPermitQuestionAnswerProvider() {
  const config = getPermitAiConfig();
  if (config.provider === 'mock') {
    return { mode: 'mock', answer: async (question, context) => mockAnswer(question, context) };
  }
  if (config.provider !== 'compatible') {
    const error = new Error(`Unsupported permit AI provider: ${config.provider}`);
    error.status = 503;
    throw error;
  }
  return {
    mode: 'live',
    answer: (question, context) => requestStructured({
      system: [
        'Answer only using the supplied Work Permit context. Never use outside knowledge or information from another permit.',
        `If the answer is not present, say exactly: "${MISSING_ANSWER}"`,
        'Keep New Application, Renewal, and Cancellation distinct. Do not provide unsupported legal advice.',
        'Keep answers concise and operational. Cite only supplied citation keys. Never invent page numbers.',
      ].join(' '),
      prompt: buildPrompt(question, context),
      schema: ANSWER_SCHEMA,
      schemaName: 'permit_grounded_answer',
      featureLabel: 'Permit question',
    }),
  };
}

module.exports = { MISSING_ANSWER, createPermitQuestionAnswerProvider };
