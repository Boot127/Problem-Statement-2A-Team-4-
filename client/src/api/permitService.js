// Dev 2 — work_permits data access.
// Backed by localStorage for now; the async function shapes match what a real
// Axios-based service (see recordService.js) would expose, so swapping in a
// live API later only touches this file.

import { getAllPermits, savePermits } from '../utils/workPermitStorage';

const SIMULATED_DELAY_MS = 150;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_DELAY_MS));
}

function list({ search = '', country = '', status = '' } = {}) {
  let permits = getAllPermits();

  if (country) {
    permits = permits.filter((p) => p.countryCode === country);
  }
  if (status) {
    permits = permits.filter((p) => p.status === status);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    permits = permits.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.permitType.toLowerCase().includes(q)
    );
  }

  const sorted = [...permits].sort((a, b) => a.title.localeCompare(b.title));
  return delay(sorted);
}

function getById(id) {
  const permit = getAllPermits().find((p) => p.id === id) || null;
  return delay(permit);
}

function create(data) {
  const permits = getAllPermits();
  const now = new Date().toISOString();
  const permit = {
    status: 'DRAFT',
    version: 1,
    ...data,
    id: `permit-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    createdAt: now,
    updatedAt: now,
  };
  permits.push(permit);
  savePermits(permits);
  return delay(permit);
}

function update(id, data) {
  const permits = getAllPermits();
  const index = permits.findIndex((p) => p.id === id);
  if (index === -1) {
    return Promise.reject(new Error('Work permit not found'));
  }
  const updated = {
    ...permits[index],
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };
  permits[index] = updated;
  savePermits(permits);
  return delay(updated);
}

function archive(id) {
  return update(id, { status: 'ARCHIVED' });
}

export default { list, getById, create, update, archive };
