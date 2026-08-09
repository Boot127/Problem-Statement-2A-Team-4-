// Presentation helpers for uploaded source documents.
// Kept in step with server/src/config/uploads.js — if the allowlist or size cap
// changes there, change it here too. The server is authoritative; these values
// only save the user a failed round trip.

export const ACCEPTED_UPLOAD_TYPES = ['.pdf', '.docx'];
export const MAX_UPLOAD_MB = 10;

export function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Coarse file-kind label derived from the display name, used for the row icon.
export function fileKind(fileName) {
  const name = String(fileName || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.docx')) return 'DOCX';
  return 'FILE';
}
