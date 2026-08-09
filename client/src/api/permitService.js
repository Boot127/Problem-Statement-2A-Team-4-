// Dev 2 — work_permits API calls.
// Talks to the Express/SQLite backend (see server/src/routes/permitRoutes.js).
// The function shapes (list/getById/create/update/archive, all Promise-based,
// getById resolving to null on not-found) are unchanged from the previous
// localStorage-backed version, so the permit pages needed no changes.

import axiosClient from './axiosClient';

// Returns the paginated envelope:
// { items, page, limit, total, totalPages, statusCounts }
// `page` is 1-based to match the API (MUI TablePagination is 0-based).
function list({
  search = '',
  country = '',
  status = '',
  reviewState = '',
  workerType = '',
  visibility = '',
  hasSource = '',
  hasRenewal = '',
  hasCancellation = '',
  processCompleteness = '',
  minFee = '',
  maxFee = '',
  minProcessingDays = '',
  maxProcessingDays = '',
  nextReviewFrom = '',
  nextReviewTo = '',
  page,
  limit,
} = {}) {
  const params = {};
  if (search) params.search = search;
  if (country) params.country = country;
  if (status) params.status = status;
  if (reviewState) params.reviewState = reviewState;
  if (workerType) params.workerType = workerType;
  if (visibility) params.visibility = visibility;
  if (hasSource !== '') params.hasSource = hasSource;
  if (hasRenewal !== '') params.hasRenewal = hasRenewal;
  if (hasCancellation !== '') params.hasCancellation = hasCancellation;
  if (processCompleteness) params.processCompleteness = processCompleteness;
  if (minFee !== '') params.minFee = minFee;
  if (maxFee !== '') params.maxFee = maxFee;
  if (minProcessingDays !== '') params.minProcessingDays = minProcessingDays;
  if (maxProcessingDays !== '') params.maxProcessingDays = maxProcessingDays;
  if (nextReviewFrom) params.nextReviewFrom = nextReviewFrom;
  if (nextReviewTo) params.nextReviewTo = nextReviewTo;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return axiosClient.get('/permits', { params }).then((res) => res.data);
}

// --- Information health (improvement plan Sections 3 and 10) ---

// Aggregate review-state counts across all non-archived permits, for the
// dashboard warnings.
function healthSummary() {
  return axiosClient.get('/permits/health-summary').then((res) => res.data);
}

// Records a compliance review without round-tripping the whole permit body.
function recordReview(id, data) {
  return axiosClient.patch(`/permits/${id}/review`, data).then((res) => res.data);
}

// Advisory duplicate check (countryCode + permitType). Resolves to an array of
// colliding permits; an empty array means no collision. Never throws on a
// match — duplicates are a warning, not a validation failure.
function checkDuplicates({ countryCode, permitType, excludeId } = {}) {
  const params = { countryCode, permitType };
  if (excludeId) params.excludeId = excludeId;
  return axiosClient.get('/permits/duplicates', { params }).then((res) => res.data);
}

function getById(id) {
  return axiosClient
    .get(`/permits/${id}`)
    .then((res) => res.data)
    .catch((err) => {
      if (err.response?.status === 404) return null;
      throw err;
    });
}

function create(data) {
  return axiosClient.post('/permits', data).then((res) => res.data);
}

function update(id, data) {
  return axiosClient.put(`/permits/${id}`, data).then((res) => res.data);
}

function archive(id) {
  return axiosClient.patch(`/permits/${id}/archive`).then((res) => res.data);
}

// --- Process steps (grouped by process type: NEW / RENEWAL / CANCELLATION) ---

function listSteps(permitId, processType) {
  const params = processType ? { processType } : {};
  return axiosClient.get(`/permits/${permitId}/steps`, { params }).then((res) => res.data);
}

function createStep(permitId, data) {
  return axiosClient.post(`/permits/${permitId}/steps`, data).then((res) => res.data);
}

function updateStep(permitId, stepId, data) {
  return axiosClient.put(`/permits/${permitId}/steps/${stepId}`, data).then((res) => res.data);
}

function deleteStep(permitId, stepId) {
  return axiosClient.delete(`/permits/${permitId}/steps/${stepId}`).then((res) => res.data);
}

function reorderSteps(permitId, processType, stepIds) {
  return axiosClient
    .patch(`/permits/${permitId}/steps/reorder`, { processType, stepIds })
    .then((res) => res.data);
}

// --- Required-document checklist (also grouped by process type) ---

function listDocuments(permitId, processType) {
  const params = processType ? { processType } : {};
  return axiosClient.get(`/permits/${permitId}/documents`, { params }).then((res) => res.data);
}

function createDocument(permitId, data) {
  return axiosClient.post(`/permits/${permitId}/documents`, data).then((res) => res.data);
}

function updateDocument(permitId, documentId, data) {
  return axiosClient
    .put(`/permits/${permitId}/documents/${documentId}`, data)
    .then((res) => res.data);
}

function deleteDocument(permitId, documentId) {
  return axiosClient
    .delete(`/permits/${permitId}/documents/${documentId}`)
    .then((res) => res.data);
}

function reorderDocuments(permitId, processType, documentIds) {
  return axiosClient
    .patch(`/permits/${permitId}/documents/reorder`, { processType, documentIds })
    .then((res) => res.data);
}

// --- Uploaded source documents (improvement plan Section 7) ---

function listSourceDocuments(permitId, { includeArchived = true } = {}) {
  return axiosClient
    .get(`/permits/${permitId}/source-documents`, { params: { includeArchived } })
    .then((res) => res.data);
}

// The browser sets the multipart boundary itself, so the Content-Type header is
// deliberately left to Axios rather than being set explicitly.
function uploadSourceDocument(permitId, file, { description, sourceType, onProgress } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (description) form.append('description', description);
  if (sourceType) form.append('sourceType', sourceType);

  return axiosClient
    .post(`/permits/${permitId}/source-documents`, form, {
      onUploadProgress: onProgress
        ? (event) =>
            onProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0)
        : undefined,
    })
    .then((res) => res.data);
}

function updateSourceDocument(permitId, documentId, data) {
  return axiosClient
    .put(`/permits/${permitId}/source-documents/${documentId}`, data)
    .then((res) => res.data);
}

function replaceSourceDocumentFile(permitId, documentId, file, { onProgress } = {}) {
  const form = new FormData();
  form.append('file', file);
  return axiosClient
    .put(`/permits/${permitId}/source-documents/${documentId}/file`, form, {
      onUploadProgress: onProgress
        ? (event) =>
            onProgress(event.total ? Math.round((event.loaded * 100) / event.total) : 0)
        : undefined,
    })
    .then((res) => res.data);
}

function archiveSourceDocument(permitId, documentId) {
  return axiosClient
    .patch(`/permits/${permitId}/source-documents/${documentId}/archive`)
    .then((res) => res.data);
}

function restoreSourceDocument(permitId, documentId) {
  return axiosClient
    .patch(`/permits/${permitId}/source-documents/${documentId}/restore`)
    .then((res) => res.data);
}

function deleteSourceDocument(permitId, documentId) {
  return axiosClient
    .delete(`/permits/${permitId}/source-documents/${documentId}`)
    .then((res) => res.data);
}

// Absolute URL for the download endpoint. The server streams the file with a
// Content-Disposition attachment header, so a plain link is enough — the
// client never learns the stored path.
function sourceDocumentDownloadUrl(permitId, documentId) {
  return `${axiosClient.defaults.baseURL}/permits/${permitId}/source-documents/${documentId}/download`;
}

function permitGuideDocxUrl(permitId) {
  return `${axiosClient.defaults.baseURL}/permits/${permitId}/guide.docx`;
}

function reminders(type = '') {
  return axiosClient.get('/permits/reminders', { params: type ? { type } : {} }).then((res) => res.data);
}

function copyProcess(destinationPermitId, data) {
  return axiosClient.post(`/permits/${destinationPermitId}/process-copy`, data).then((res) => res.data);
}

function extractSourceDocument(permitId, documentId) {
  return axiosClient.post(`/permits/${permitId}/source-documents/${documentId}/extract`).then((res) => res.data);
}

function applySourceExtractionDraft(permitId, documentId, data) {
  return axiosClient.post(`/permits/${permitId}/source-documents/${documentId}/extraction-draft`, data).then((res) => res.data);
}

function compareSourceDocument(permitId, documentId) {
  return axiosClient.post(`/permits/${permitId}/source-documents/${documentId}/compare`).then((res) => res.data);
}

function applySourceChangesDraft(permitId, documentId, changes) {
  return axiosClient.post(`/permits/${permitId}/source-documents/${documentId}/change-draft`, { changes }).then((res) => res.data);
}

function askPermit(permitId, question) {
  return axiosClient.post(`/permits/${permitId}/ask`, { question }).then((res) => res.data);
}

function checkEligibility(permitId, applicant) {
  return axiosClient.post(`/permits/${permitId}/check-eligibility`, applicant).then((res) => res.data);
}

// --- Permit Groups (many-to-many references to master permits) ---
function listGroups({ includeArchived = false } = {}) {
  return axiosClient.get('/permits/groups', { params: { includeArchived } }).then((res) => res.data);
}

function getGroup(groupId) {
  return axiosClient.get(`/permits/groups/${groupId}`).then((res) => res.data);
}

function createGroup(data) {
  return axiosClient.post('/permits/groups', data).then((res) => res.data);
}

function updateGroup(groupId, data) {
  return axiosClient.put(`/permits/groups/${groupId}`, data).then((res) => res.data);
}

function archiveGroup(groupId) {
  return axiosClient.patch(`/permits/groups/${groupId}/archive`).then((res) => res.data);
}

function restoreGroup(groupId) {
  return axiosClient.patch(`/permits/groups/${groupId}/restore`).then((res) => res.data);
}

function addPermitToGroup(groupId, permitId) {
  return axiosClient.post(`/permits/groups/${groupId}/members`, { permitId }).then((res) => res.data);
}

function removePermitFromGroup(groupId, permitId) {
  return axiosClient.delete(`/permits/groups/${groupId}/members/${permitId}`).then((res) => res.data);
}

function listPermitGroups(permitId, { includeArchived = false } = {}) {
  return axiosClient.get(`/permits/${permitId}/groups`, { params: { includeArchived } }).then((res) => res.data);
}

export default {
  list,
  getById,
  create,
  update,
  archive,
  healthSummary,
  reminders,
  recordReview,
  checkDuplicates,
  listSteps,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  reorderDocuments,
  copyProcess,
  listSourceDocuments,
  uploadSourceDocument,
  updateSourceDocument,
  replaceSourceDocumentFile,
  archiveSourceDocument,
  restoreSourceDocument,
  deleteSourceDocument,
  sourceDocumentDownloadUrl,
  permitGuideDocxUrl,
  extractSourceDocument,
  applySourceExtractionDraft,
  compareSourceDocument,
  applySourceChangesDraft,
  askPermit,
  checkEligibility,
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  archiveGroup,
  restoreGroup,
  addPermitToGroup,
  removePermitFromGroup,
  listPermitGroups,
};
