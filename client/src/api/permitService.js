// Dev 2 — work_permits API calls.
// Talks to the Express/SQLite backend (see server/src/routes/permitRoutes.js).
// The function shapes (list/getById/create/update/archive, all Promise-based,
// getById resolving to null on not-found) are unchanged from the previous
// localStorage-backed version, so the permit pages needed no changes.

import axiosClient from './axiosClient';

function list({ search = '', country = '', status = '' } = {}) {
  const params = {};
  if (search) params.search = search;
  if (country) params.country = country;
  if (status) params.status = status;
  return axiosClient.get('/permits', { params }).then((res) => res.data);
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

export default { list, getById, create, update, archive };
