const { getPermitAiConfig, requestStructured } = require('./permitAiClient');

const ELIGIBILITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matchedConditions: { type: 'array', items: { type: 'string' } },
    uncertainConditions: { type: 'array', items: { type: 'string' } },
    conditionsRequiringReview: { type: 'array', items: { type: 'string' } },
  },
  required: ['matchedConditions', 'uncertainConditions', 'conditionsRequiringReview'],
};

function mockCompare(applicant, eligibilityText) {
  if (!eligibilityText) {
    return { matchedConditions: [], uncertainConditions: [], conditionsRequiringReview: ['No eligibility criteria are recorded for this permit.'] };
  }
  const matchedConditions = [];
  if (applicant.jobRole) matchedConditions.push(`Job role information was provided: ${applicant.jobRole}.`);
  if (applicant.highestQualification) matchedConditions.push(`Qualification information was provided: ${applicant.highestQualification}.`);
  if (applicant.yearsRelevantExperience !== null) matchedConditions.push(`${applicant.yearsRelevantExperience} years of relevant experience were provided.`);
  return {
    matchedConditions,
    uncertainConditions: ['The stored free-text eligibility criteria may contain conditions that are not structured for automatic evaluation.'],
    conditionsRequiringReview: ['Compliance must verify the applicant details against the latest official requirements.'],
  };
}

function createPermitEligibilityProvider() {
  const config = getPermitAiConfig();
  if (config.provider === 'mock') return { mode: 'mock', compare: async (applicant, text) => mockCompare(applicant, text) };
  if (config.provider !== 'compatible') {
    const error = new Error(`Unsupported permit AI provider: ${config.provider}`);
    error.status = 503;
    throw error;
  }
  return {
    mode: 'live',
    compare: (applicant, eligibilityText) => requestStructured({
      system: [
        'Compare applicant information only with the supplied stored permit eligibility text.',
        'Do not decide legal eligibility and do not use outside knowledge.',
        'Identify possible matches, uncertainty, and conditions requiring Compliance review.',
        'Never claim that the applicant is legally eligible. Keep explanations concise.',
      ].join(' '),
      prompt: `STORED ELIGIBILITY TEXT:\n${eligibilityText || 'Not recorded'}\n\nAPPLICANT INFORMATION:\n${JSON.stringify(applicant)}`,
      schema: ELIGIBILITY_SCHEMA,
      schemaName: 'permit_eligibility_comparison',
      featureLabel: 'Eligibility comparison',
    }),
  };
}

module.exports = { createPermitEligibilityProvider };
