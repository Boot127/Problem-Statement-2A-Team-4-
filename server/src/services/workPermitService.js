// Dev 2 — work_permits CRUD business logic (Section 11).
// Maps between the frontend's camelCase permit shape and the SQLite
// snake_case columns so permitRoutes/permitController stay simple.

const permitRepository = require('../repositories/permitRepository');

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const VALID_WORKER_TYPES = ['LOCAL', 'FOREIGN_WORKER', 'EXPATRIATE', 'ALL_EMPLOYEES'];
const VALID_VISIBILITY = ['COMPLIANCE_ONLY', 'INTERNAL_STAFF', 'CLIENT_SHAREABLE'];

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function toDbRow(data) {
  if (!data.title || !data.title.trim()) {
    throw new ValidationError('Title is required');
  }
  if (!data.permitType || !data.permitType.trim()) {
    throw new ValidationError('Permit type is required');
  }
  if (!data.countryCode) {
    throw new ValidationError('Country is required');
  }

  return {
    country_code: data.countryCode,
    permit_type: data.permitType,
    title: data.title,
    description: data.description || null,
    eligibility_criteria: data.eligibilityCriteria || null,
    processing_time_days: toNullableNumber(data.processingTimeDays),
    validity_months: toNullableNumber(data.validityMonths),
    government_fee: toNullableNumber(data.governmentFee),
    currency_code: data.currencyCode || null,
    worker_type: VALID_WORKER_TYPES.includes(data.workerType) ? data.workerType : 'FOREIGN_WORKER',
    visibility: VALID_VISIBILITY.includes(data.visibility) ? data.visibility : 'INTERNAL_STAFF',
    source_url: data.sourceUrl || null,
    version: data.version || 1,
    status: VALID_STATUSES.includes(data.status) ? data.status : 'DRAFT',
  };
}

function toApiShape(row) {
  if (!row) return null;
  return {
    id: row.permit_id,
    countryCode: row.country_code,
    permitType: row.permit_type,
    title: row.title,
    description: row.description || '',
    eligibilityCriteria: row.eligibility_criteria || '',
    processingTimeDays: row.processing_time_days,
    validityMonths: row.validity_months,
    governmentFee: row.government_fee,
    currencyCode: row.currency_code || '',
    workerType: row.worker_type,
    visibility: row.visibility,
    sourceUrl: row.source_url || '',
    version: row.version,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listPermits(filters) {
  return permitRepository.findAll(filters).map(toApiShape);
}

function getPermitById(id) {
  return toApiShape(permitRepository.findById(id));
}

function createPermit(data) {
  const now = new Date().toISOString();
  const row = { ...toDbRow(data), created_at: now, updated_at: now };
  return toApiShape(permitRepository.insert(row));
}

function updatePermit(id, data) {
  const existing = permitRepository.findById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const row = { ...toDbRow(data), updated_at: now };
  return toApiShape(permitRepository.update(id, row));
}

function archivePermit(id) {
  const existing = permitRepository.findById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  return toApiShape(permitRepository.archive(id, now));
}

module.exports = {
  ValidationError,
  listPermits,
  getPermitById,
  createPermit,
  updatePermit,
  archivePermit,
};
