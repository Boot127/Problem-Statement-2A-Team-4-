// Dev 1 — compliance_records data access (HLD Section 14.2).
// Talks to the real Express/SQLite backend in server/ via axiosClient.

import axiosClient from './axiosClient';

function list(params = {}) {
  return axiosClient.get('/records', { params }).then((res) => res.data);
}

function getById(id) {
  return axiosClient
    .get(`/records/${id}`)
    .then((res) => res.data.data)
    .catch((err) => {
      if (err.response?.status === 404) return null;
      throw err;
    });
}

function create(payload) {
  return axiosClient.post('/records', payload).then((res) => res.data.data);
}

function update(id, payload) {
  return axiosClient.put(`/records/${id}`, payload).then((res) => res.data.data);
}

function archive(id) {
  return axiosClient.patch(`/records/${id}/archive`).then((res) => res.data.data);
}

function addComponent(id, payload) {
  return axiosClient.post(`/records/${id}/components`, payload).then((res) => res.data.data);
}

function addAttachment(id, file) {
  const formData = new FormData();
  formData.append('file', file);
  return axiosClient
    .post(`/records/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data.data);
}

// mode: 'grammar' | 'rewrite' | 'summarise' | 'translate'
// Either `text` or `field` (summary|fullText, pulled from the saved record
// server-side) must be provided. Never modifies the record — the caller
// applies the suggestion locally and saves it via update() if accepted
// (FR-1.6 / Section 16.1: "AI returns a suggestion; original NOT modified").
function aiAssist(id, { mode, field, text }) {
  return axiosClient.post(`/records/${id}/ai-assist`, { mode, field, text }).then((res) => res.data.data);
}

export default { list, getById, create, update, archive, addComponent, addAttachment, aiAssist };
