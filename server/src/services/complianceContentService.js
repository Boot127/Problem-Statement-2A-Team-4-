// Dev 1 — compliance_records CRUD, benefit components, attachments,
// AI-writing calls (HLD Section 11 / FR-1).

const recordRepository = require('../repositories/recordRepository');
const countryRepository = require('../repositories/countryRepository');
const auditService = require('./auditService');
const aiService = require('./aiService');
const { allowedVisibilityFor } = require('../utils/visibilityRules');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function resolveCountry(countryCode) {
  const country = countryRepository.findByCode(countryCode);
  if (!country) {
    throw httpError(400, `Unknown country code: ${countryCode}`);
  }
  return country;
}

function list(query, user) {
  return recordRepository.list({
    country: query.country,
    category: query.category,
    workerType: query.workerType,
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
    allowedVisibility: allowedVisibilityFor(user.role),
  });
}

function getById(id, user) {
  const record = recordRepository.findById(id, allowedVisibilityFor(user.role));
  if (!record) {
    throw httpError(404, 'Compliance record not found');
  }
  return record;
}

// Records with the same country + title + effective date are treated as
// duplicates of the same fact (the exact scenario the HLD's business
// problem calls out: "the same fact ... with three different values").
function assertNotDuplicate(countryId, title, effectiveDate, ignoreId) {
  if (recordRepository.findDuplicate(countryId, title, effectiveDate, ignoreId)) {
    throw httpError(409, 'Duplicate entry detected: a record with the same country, title, and effective date already exists.');
  }
}

function create(payload, user) {
  const country = resolveCountry(payload.countryCode);
  assertNotDuplicate(country.country_id, payload.title, payload.effectiveDate || null);

  const record = recordRepository.create({ ...payload, countryId: country.country_id }, user.id);
  auditService.log({ userId: user.id, action: 'create', entityType: 'compliance_record', entityId: record.id, newValue: record });
  return record;
}

function update(id, payload, user) {
  const existing = getById(id, user);
  if (existing.status === 'ARCHIVED') {
    throw httpError(409, 'Archived records cannot be edited.');
  }

  const country = resolveCountry(payload.countryCode);
  assertNotDuplicate(country.country_id, payload.title, payload.effectiveDate || null, id);

  const updated = recordRepository.update(id, { ...payload, countryId: country.country_id }, user.id);
  auditService.log({
    userId: user.id,
    action: 'update',
    entityType: 'compliance_record',
    entityId: id,
    oldValue: existing,
    newValue: updated,
  });
  return updated;
}

// FR-1.7: archiving is the only soft-delete action — compliance_records are
// never hard-deleted through this API.
function archive(id, user) {
  const existing = getById(id, user);
  const updated = recordRepository.archive(id, user.id);
  auditService.log({
    userId: user.id,
    action: 'archive',
    entityType: 'compliance_record',
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: updated.status },
  });
  return updated;
}

function listVersions(recordId, user) {
  getById(recordId, user); // 404s if missing or not visible to this role
  return recordRepository.findVersions(recordId);
}

function addComponent(recordId, payload, user) {
  const existing = getById(recordId, user);
  if (existing.status === 'ARCHIVED') {
    throw httpError(409, 'Archived records cannot be edited.');
  }
  if (!payload.componentName) {
    throw httpError(400, 'componentName is required');
  }
  const component = recordRepository.addComponent(recordId, payload);
  auditService.log({
    userId: user.id,
    action: 'update',
    entityType: 'benefit_component',
    entityId: component.id,
    newValue: component,
  });
  return component;
}

function addAttachment(recordId, fileMeta, user) {
  const existing = getById(recordId, user);
  if (existing.status === 'ARCHIVED') {
    throw httpError(409, 'Archived records cannot be edited.');
  }
  const attachment = recordRepository.addAttachment(recordId, fileMeta, user.id);
  auditService.log({
    userId: user.id,
    action: 'update',
    entityType: 'record_attachment',
    entityId: attachment.id,
    newValue: attachment,
  });
  return attachment;
}

function updateComponent(recordId, componentId, payload, user) {
  const record = getById(recordId, user);
  if (record.status === 'ARCHIVED') {
    throw httpError(409, 'Archived records cannot be edited.');
  }
  const existing = record.benefitComponents.find((c) => c.id === componentId);
  if (!existing) {
    throw httpError(404, 'Benefit component not found on this record.');
  }
  if (!payload.componentName) {
    throw httpError(400, 'componentName is required');
  }
  const updated = recordRepository.updateComponent(componentId, payload);
  auditService.log({
    userId: user.id,
    action: 'update',
    entityType: 'benefit_component',
    entityId: componentId,
    oldValue: existing,
    newValue: updated,
  });
  return updated;
}

function removeComponent(recordId, componentId, user) {
  const record = getById(recordId, user);
  if (record.status === 'ARCHIVED') {
    throw httpError(409, 'Archived records cannot be edited.');
  }
  const existing = record.benefitComponents.find((c) => c.id === componentId);
  if (!existing) {
    throw httpError(404, 'Benefit component not found on this record.');
  }
  recordRepository.removeComponent(componentId);
  auditService.log({
    userId: user.id,
    action: 'update',
    entityType: 'benefit_component',
    entityId: componentId,
    oldValue: existing,
    newValue: null,
  });
}

// Returns the deleted attachment's metadata (filePath in particular) so the
// controller can also remove the file from disk — the service layer stays
// storage-agnostic and doesn't touch the filesystem itself.
function removeAttachment(recordId, attachmentId, user) {
  const record = getById(recordId, user);
  if (record.status === 'ARCHIVED') {
    throw httpError(409, 'Archived records cannot be edited.');
  }
  const existing = record.attachments.find((a) => a.id === attachmentId);
  if (!existing) {
    throw httpError(404, 'Attachment not found on this record.');
  }
  recordRepository.removeAttachment(attachmentId);
  auditService.log({
    userId: user.id,
    action: 'update',
    entityType: 'record_attachment',
    entityId: attachmentId,
    oldValue: existing,
    newValue: null,
  });
  return existing;
}

// FR-1.6 / Section 16.1: the assistant only ever returns a suggestion. It
// never writes to the record — accepting a suggestion is just a normal
// PUT /records/:id from the client with the edited text.
async function aiAssist(recordId, { mode, field, text }, user) {
  const record = getById(recordId, user);
  const source = text ?? (field ? record[field] : null);
  if (!source) {
    throw httpError(400, 'Provide `text`, or a `field` (summary|fullText) that has content.');
  }
  const result = await aiService.assist(mode, source);
  return { mode, field: field || null, original: source, ...result };
}

module.exports = {
  allowedVisibilityFor,
  list,
  getById,
  create,
  update,
  archive,
  addComponent,
  updateComponent,
  removeComponent,
  addAttachment,
  removeAttachment,
  aiAssist,
  listVersions,
};
