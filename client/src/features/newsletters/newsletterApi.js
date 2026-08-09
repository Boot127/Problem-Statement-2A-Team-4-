// Dev 4 — newsletters + detected_updates API calls. Talks to
// server/src/routes/newsletterRoutes.js via the shared axiosClient (adds
// the auth Bearer token and redirects to /login on a 401, same as every
// other feature — see client/src/api/reviewService.js).

import axiosClient from '../../api/axiosClient';

function unwrapError(err) {
  const data = err?.response?.data;
  const details = data?.errors?.join(' ') || data?.message;
  return new Error(details || 'Request failed.');
}

export function getNewsletters(filters = {}) {
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.country) params.country = filters.country;
  if (filters.status) params.status = filters.status;

  return axiosClient
    .get('/newsletters', { params })
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}

export function createNewsletter(data) {
  return axiosClient
    .post('/newsletters', data)
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}

export function updateNewsletter(id, data) {
  return axiosClient
    .put(`/newsletters/${id}`, data)
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}

export function deleteNewsletter(id) {
  return axiosClient
    .delete(`/newsletters/${id}`)
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}

export function uploadNewsletterFile(id, file) {
  const formData = new FormData();
  formData.append('file', file);

  return axiosClient
    .post(`/newsletters/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}

export function summarizeNewsletter(id) {
  return axiosClient
    .post(`/newsletters/${id}/summarize`)
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}

export function reviewNewsletter(id, decision, linkedComplianceArea) {
  return axiosClient
    .post(`/newsletters/${id}/review`, {
      decision,
      linked_compliance_area: linkedComplianceArea,
    })
    .then((res) => res.data)
    .catch((err) => { throw unwrapError(err); });
}
