// Dev 3 — review_requests API calls.
// Talks to the Express/SQLite backend (see server/src/routes/reviewRoutes.js).

import axiosClient from './axiosClient';

function list({ search = '', targetType = '', status = '' } = {}) {
  const params = {};
  if (search) params.search = search;
  if (targetType) params.targetType = targetType;
  if (status) params.status = status;
  return axiosClient.get('/reviews', { params }).then((res) => res.data);
}

function getById(id) {
  return axiosClient
    .get(`/reviews/${id}`)
    .then((res) => res.data)
    .catch((err) => {
      if (err.response?.status === 404) return null;
      throw err;
    });
}

function create(data) {
  return axiosClient.post('/reviews', data).then((res) => res.data);
}

function update(id, data) {
  return axiosClient.put(`/reviews/${id}`, data).then((res) => res.data);
}

function transition(id, status, actor) { return axiosClient.patch(`/reviews/${id}/transition`, { status, actor }).then((res) => res.data); }
function addComment(id, data) { return axiosClient.post(`/reviews/${id}/comments`, data).then((res) => res.data); }
function publish(id) { return axiosClient.post(`/reviews/${id}/publish`).then((res) => res.data); }
function targets(type) { return axiosClient.get('/reviews/targets/options', { params: { type } }).then((res) => res.data); }
function notifications() { return axiosClient.get('/notifications').then((res) => res.data); }
function archive(id) { return transition(id, 'ARCHIVED'); }

export default { list, getById, create, update, archive, transition, addComment, publish, targets, notifications };
