// Client-side CSV export for the compliance record list (TC6.6).
// No PDF library is installed; a "print to PDF" fallback is offered in the
// UI via window.print() instead of a fabricated PDF export.

import { countryName } from './countries';
import { RECORD_CATEGORY_LABELS, WORKER_TYPE_LABELS } from './enums';

// Prefixing values that start with =, +, -, or @ with a tab prevents CSV
// injection when the file is opened in spreadsheet software.
function escapeCsvValue(value) {
  const str = String(value ?? '');
  const guarded = /^[=+\-@]/.test(str) ? `\t${str}` : str;
  if (/[",\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export function buildRecordsCsv(records) {
  const headers = ['Title', 'Country', 'Category', 'Worker Type', 'Status', 'Effective Date'];
  const rows = records.map((r) => [
    r.title,
    countryName(r.countryCode),
    RECORD_CATEGORY_LABELS[r.category] || r.category,
    WORKER_TYPE_LABELS[r.workerType] || r.workerType,
    r.status,
    r.effectiveDate || '',
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
