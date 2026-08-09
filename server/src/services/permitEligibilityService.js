const workPermitService = require('./workPermitService');
const { createPermitEligibilityProvider } = require('./permitEligibilityProvider');
const { ValidationError, NotFoundError } = require('../utils/errors');

const DISCLAIMER = 'Eligibility results are an internal screening aid based on the information currently stored in this platform. Final eligibility must be verified by Compliance against the latest official requirements.';

function optionalText(value, label, max = 200) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim();
  if (text.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer`);
  return text;
}

function optionalNumber(value, label, { min, max }) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new ValidationError(`${label} must be a number between ${min} and ${max}`);
  return number;
}

function validateApplicant(input = {}) {
  return {
    nationality: optionalText(input.nationality, 'Nationality', 100),
    age: optionalNumber(input.age, 'Age', { min: 16, max: 100 }),
    monthlySalary: optionalNumber(input.monthlySalary, 'Monthly salary', { min: 0, max: 1_000_000_000 }),
    salaryCurrency: optionalText(input.salaryCurrency, 'Salary currency', 3).toUpperCase(),
    jobRole: optionalText(input.jobRole, 'Job role', 200),
    yearsRelevantExperience: optionalNumber(input.yearsRelevantExperience, 'Years of relevant experience', { min: 0, max: 80 }),
    highestQualification: optionalText(input.highestQualification, 'Highest qualification', 200),
  };
}

function parseExplicitRules(text = '') {
  const rules = [];
  const salary = text.match(/(?:minimum(?:\s+qualifying)?\s+monthly\s+salary(?:\s+of)?|monthly\s+salary\s+(?:of\s+)?at\s+least)\s*([A-Z]{3})?\s*([\d,]+(?:\.\d+)?)/i);
  if (salary) rules.push({ type: 'MIN_SALARY', value: Number(salary[2].replace(/,/g, '')), unit: salary[1]?.toUpperCase() || '', description: salary[0] });
  const ageMin = text.match(/(?:minimum\s+age|at\s+least)\s*(\d+)\s*(?:years?\s+old|years?\s+of\s+age)/i);
  if (ageMin) rules.push({ type: 'AGE_MIN', value: Number(ageMin[1]), unit: 'years', description: ageMin[0] });
  const ageMax = text.match(/(?:maximum\s+age|no\s+older\s+than|not\s+more\s+than)\s*(\d+)\s*(?:years?\s+old|years?\s+of\s+age)/i);
  if (ageMax) rules.push({ type: 'AGE_MAX', value: Number(ageMax[1]), unit: 'years', description: ageMax[0] });
  const experience = text.match(/(?:minimum(?:\s+of)?|at\s+least)\s*(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+)?(?:professional\s+)?experience/i);
  if (experience) rules.push({ type: 'MIN_EXPERIENCE_YEARS', value: Number(experience[1]), unit: 'years', description: experience[0] });
  return rules;
}

function evaluateRules(rules, applicant) {
  return rules.map((rule) => {
    let applicantValue;
    let passes;
    let currencyMismatch = false;
    if (rule.type === 'MIN_SALARY') {
      applicantValue = applicant.monthlySalary;
      currencyMismatch = Boolean(rule.unit && applicant.salaryCurrency && rule.unit !== applicant.salaryCurrency);
      passes = applicantValue === null || currencyMismatch ? null : applicantValue >= rule.value;
    } else if (rule.type === 'AGE_MIN') {
      applicantValue = applicant.age;
      passes = applicantValue === null ? null : applicantValue >= rule.value;
    } else if (rule.type === 'AGE_MAX') {
      applicantValue = applicant.age;
      passes = applicantValue === null ? null : applicantValue <= rule.value;
    } else {
      applicantValue = applicant.yearsRelevantExperience;
      passes = applicantValue === null ? null : applicantValue >= rule.value;
    }
    const result = currencyMismatch ? 'REVIEW' : passes === null ? 'MISSING' : passes ? 'PASS' : 'FAIL';
    return {
      ruleType: rule.type,
      applicantValue,
      storedRequirement: `${rule.value}${rule.unit ? ` ${rule.unit}` : ''}`,
      result,
      explanation: result === 'REVIEW'
        ? `The applicant salary currency (${applicant.salaryCurrency}) differs from the stored requirement currency (${rule.unit}); automatic comparison is not valid.`
        : result === 'MISSING'
        ? 'Applicant information is missing for this explicit stored requirement.'
        : result === 'PASS'
          ? 'Applicant information appears to satisfy this explicit stored requirement.'
          : 'Applicant information does not satisfy this explicit stored requirement; Compliance review is required.',
    };
  });
}

async function checkEligibility(permitId, applicantInput, { provider } = {}) {
  const permit = await workPermitService.getPermitById(permitId);
  if (!permit) throw new NotFoundError('Work permit not found');
  if (permit.status === 'ARCHIVED') throw new ValidationError('Eligibility cannot be screened against an archived permit');
  const applicant = validateApplicant(applicantInput);
  const requiredFields = ['nationality', 'age', 'monthlySalary', 'jobRole', 'yearsRelevantExperience', 'highestQualification'];
  const missingApplicantInformation = requiredFields.filter((field) => applicant[field] === '' || applicant[field] === null);
  const rules = parseExplicitRules(permit.eligibilityCriteria);
  const ruleResults = evaluateRules(rules, applicant);
  const selectedProvider = provider || createPermitEligibilityProvider();
  const comparison = await selectedProvider.compare(applicant, permit.eligibilityCriteria || '');
  const matchedConditions = Array.isArray(comparison.matchedConditions) ? comparison.matchedConditions.map(String) : [];
  const uncertainConditions = Array.isArray(comparison.uncertainConditions) ? comparison.uncertainConditions.map(String) : [];
  const conditionsRequiringReview = Array.isArray(comparison.conditionsRequiringReview) ? comparison.conditionsRequiringReview.map(String) : [];
  const failed = ruleResults.some((item) => item.result === 'FAIL');
  let outcome = 'POSSIBLE_MATCH';
  if (missingApplicantInformation.length || ruleResults.some((item) => item.result === 'MISSING')) outcome = 'MISSING_INFORMATION';
  else if (failed || ruleResults.some((item) => item.result === 'REVIEW') || !permit.eligibilityCriteria) outcome = 'REQUIRES_COMPLIANCE_REVIEW';
  else if (rules.length && ruleResults.every((item) => item.result === 'PASS') && !uncertainConditions.length && !conditionsRequiringReview.length) outcome = 'LIKELY_MATCH';
  return {
    outcome,
    advisoryOnly: true,
    applicant,
    explicitRuleResults: ruleResults,
    matchedConditions,
    uncertainConditions,
    missingApplicantInformation,
    conditionsRequiringReview,
    providerMode: selectedProvider.mode,
    disclaimer: DISCLAIMER,
  };
}

module.exports = { DISCLAIMER, validateApplicant, parseExplicitRules, evaluateRules, checkEligibility };
