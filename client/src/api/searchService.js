// Shared — cross-entity keyword search + filters (HLD Section 14.6).
// Owned by Developer 1 (see docs/HIGH_LEVEL_DESIGN.md Section 5).

import axiosClient from './axiosClient';

function search({ q, country, category, workerType, status, type, page, limit } = {}) {
  const params = {};
  if (q) params.q = q;
  if (country) params.country = country;
  if (category) params.category = category;
  if (workerType) params.workerType = workerType;
  if (status) params.status = status;
  if (type) params.type = type;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return axiosClient.get('/search', { params }).then((res) => res.data);
}

export default { search };
