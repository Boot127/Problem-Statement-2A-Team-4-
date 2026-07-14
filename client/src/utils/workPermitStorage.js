// localStorage-backed persistence for work permits (Dev 2 prototype).
// Swappable later for a real API call from permitService.js.

import { SAMPLE_PERMITS } from './samplePermits';

const STORAGE_KEY = 'hrckmp_work_permits';

function readAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeAll(permits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permits));
}

function ensureSeeded() {
  const existing = readAll();
  if (existing === null) {
    writeAll(SAMPLE_PERMITS);
    return SAMPLE_PERMITS;
  }
  return existing;
}

export function getAllPermits() {
  return ensureSeeded();
}

export function savePermits(permits) {
  writeAll(permits);
}
