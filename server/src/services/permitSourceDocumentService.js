// Dev 2 — source-document business logic (improvement plan Section 7).
//
// Owns file validation, safe storage, and the metadata lifecycle. Like the
// step/document services it depends on permitRepository (not workPermitService)
// for the parent check, so the module graph stays acyclic.

const fs = require('fs');
const crypto = require('crypto');
const permitRepository = require('../repositories/permitRepository');
const repository = require('../repositories/permitSourceDocumentRepository');
const uploads = require('../config/uploads');
const { ValidationError, NotFoundError } = require('../utils/errors');

const VALID_SOURCE_TYPES = [
  'OFFICIAL_GUIDE',
  'LEGISLATION',
  'FORM',
  'CIRCULAR',
  'INTERNAL_NOTE',
  'OTHER',
];
const MAX_DESCRIPTION = 500;
const MAX_ORIGINAL_NAME = 250;

function toApiShape(row) {
  if (!row) return null;
  return {
    id: row.source_document_id,
    permitId: row.permit_id,
    // Only the display name is exposed. storedFileName and the absolute path
    // stay server-side — the client downloads by document id, never by path.
    fileName: row.original_file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    description: row.description || '',
    sourceType: row.source_type,
    status: row.status,
    uploadedBy: row.uploaded_by || '',
    uploadedAt: row.uploaded_at,
  };
}

async function requirePermitId(permitId) {
  const id = Number(permitId);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid permit id');
  if (!await permitRepository.findById(id)) throw new NotFoundError('Work permit not found');
  return id;
}

function requireDocumentId(documentId) {
  const id = Number(documentId);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid source document id');
  return id;
}

// Always scoped to the parent permit, so a valid id belonging to a different
// permit reads as "not found" rather than leaking another permit's file.
async function requireOwnedDocument(permitId, documentId) {
  const row = await repository.findById(documentId);
  if (!row || row.permit_id !== permitId) throw new NotFoundError('Source document not found');
  return row;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  if (text.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer`);
  }
  return text;
}

function requireEnum(value, allowed, label, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalised = String(value).toUpperCase();
  if (!allowed.includes(normalised)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}`);
  }
  return normalised;
}

// Sanitises the untrusted original name for DISPLAY only. It is never used to
// build a path — strip directory separators so a name like
// "../../etc/passwd" cannot mislead a reader or a download header.
function safeDisplayName(originalName) {
  const base = String(originalName || 'document')
    // Directory separators — display only, but a name reading
    // '../../etc/passwd' is misleading at best.
    .replace(/[\\/]/g, '_')
    // Control characters, which could forge a line break in the
    // Content-Disposition header. Spaces and hyphens are legitimate and stay.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '')
    // A double quote would terminate the filename in that same header.
    .replace(/"/g, "'")
    .trim();
  if (!base) throw new ValidationError('The file must have a name');
  if (base.length > MAX_ORIGINAL_NAME) {
    throw new ValidationError(`File name must be ${MAX_ORIGINAL_NAME} characters or fewer`);
  }
  return base;
}

// Runs every content-level check and writes the file. Returns the details the
// repository needs. Nothing is written until all checks pass.
function storeUploadedFile(file) {
  if (!file) throw new ValidationError('No file was uploaded');
  if (!file.buffer || file.buffer.length === 0) {
    throw new ValidationError('The uploaded file is empty');
  }
  if (file.buffer.length > uploads.MAX_FILE_BYTES) {
    throw new ValidationError(
      `File must be ${Math.round(uploads.MAX_FILE_BYTES / (1024 * 1024))} MB or smaller`
    );
  }

  const extension = uploads.extensionOf(file.originalname);
  const type = uploads.typeForExtension(extension);
  if (!type) throw new ValidationError(`Only ${uploads.ALLOWED_LABEL} files are accepted`);

  // The decisive check: the bytes must actually be what the extension claims.
  if (!uploads.matchesMagicBytes(file.buffer, type)) {
    throw new ValidationError(
      `This file is not a valid ${type.label}. Its contents do not match its ${extension} extension.`
    );
  }

  const storedFileName = uploads.generateStoredFileName(extension);
  fs.writeFileSync(uploads.storedFilePath(storedFileName), file.buffer);

  return {
    storedFileName,
    originalFileName: safeDisplayName(file.originalname),
    mimeType: file.mimetype,
    fileSize: file.buffer.length,
    fileHash: crypto.createHash('sha256').update(file.buffer).digest('hex'),
  };
}

// Best-effort disk cleanup. A missing file must not turn into a 500 — the row
// is the record of truth and the user's action should still succeed.
function deleteStoredFile(storedFileName) {
  try {
    fs.unlinkSync(uploads.storedFilePath(storedFileName));
  } catch {
    // Already gone, or never written. Nothing to do.
  }
}

async function listSourceDocuments(permitId, { includeArchived = true } = {}) {
  const id = await requirePermitId(permitId);
  return (await repository.findByPermit(id, { includeArchived })).map(toApiShape);
}

async function getSourceDocument(permitId, documentId) {
  const id = await requirePermitId(permitId);
  return toApiShape(await requireOwnedDocument(id, requireDocumentId(documentId)));
}

// Returns what a download handler needs: the resolved path plus the display
// name and MIME type. Throws NotFoundError if the row exists but the file does
// not, which is more honest than streaming an empty response.
async function getDownloadTarget(permitId, documentId) {
  const id = await requirePermitId(permitId);
  const row = await requireOwnedDocument(id, requireDocumentId(documentId));
  const filePath = uploads.storedFilePath(row.stored_file_name);
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('The stored file for this source document is missing');
  }
  return { filePath, fileName: row.original_file_name, mimeType: row.mime_type };
}

async function createSourceDocument(permitId, file, data = {}) {
  const id = await requirePermitId(permitId);
  const stored = storeUploadedFile(file);

  // Duplicate content check — same bytes already attached to this permit.
  const existing = await repository.findByHash(id, stored.fileHash);
  if (existing) {
    deleteStoredFile(stored.storedFileName);
    throw new ValidationError(
      `This exact file is already attached to this permit as "${existing.original_file_name}"`
    );
  }

  try {
    return toApiShape(
      await repository.insert({
        permit_id: id,
        original_file_name: stored.originalFileName,
        stored_file_name: stored.storedFileName,
        mime_type: stored.mimeType,
        file_size: stored.fileSize,
        file_hash: stored.fileHash,
        description: optionalText(data.description, 'Description', MAX_DESCRIPTION),
        source_type: requireEnum(
          data.sourceType,
          VALID_SOURCE_TYPES,
          'Source type',
          'OFFICIAL_GUIDE'
        ),
        status: 'ACTIVE',
        uploaded_by: optionalText(data.uploadedBy, 'Uploaded by', 120),
        uploaded_at: new Date().toISOString(),
      })
    );
  } catch (err) {
    // A metadata validation/DB failure must not leave an unreferenced file on
    // disk. Only the successfully inserted row owns the stored file.
    deleteStoredFile(stored.storedFileName);
    throw err;
  }
}

// Metadata only — lifecycle state is changed exclusively through the
// archive/restore actions so duplicate-file checks cannot be bypassed here.
async function updateSourceDocument(permitId, documentId, data = {}) {
  const id = await requirePermitId(permitId);
  const row = await requireOwnedDocument(id, requireDocumentId(documentId));

  return toApiShape(
    await repository.update(row.source_document_id, {
      description:
        data.description === undefined
          ? row.description
          : optionalText(data.description, 'Description', MAX_DESCRIPTION),
      source_type: requireEnum(data.sourceType, VALID_SOURCE_TYPES, 'Source type', row.source_type),
      status: row.status,
    })
  );
}

// Swaps the file behind an existing record, keeping the id stable so any link
// to it still resolves. The old file is removed only after the row is updated.
async function replaceSourceDocument(permitId, documentId, file) {
  const id = await requirePermitId(permitId);
  const row = await requireOwnedDocument(id, requireDocumentId(documentId));
  const stored = storeUploadedFile(file);

  const duplicate = await repository.findByHash(id, stored.fileHash, {
    excludeId: row.source_document_id,
  });
  if (duplicate) {
    deleteStoredFile(stored.storedFileName);
    throw new ValidationError(
      `This exact file is already attached to this permit as "${duplicate.original_file_name}"`
    );
  }

  let updated;
  try {
    updated = await repository.replaceFile(row.source_document_id, {
      original_file_name: stored.originalFileName,
      stored_file_name: stored.storedFileName,
      mime_type: stored.mimeType,
      file_size: stored.fileSize,
      file_hash: stored.fileHash,
      uploaded_at: new Date().toISOString(),
    });
  } catch (err) {
    deleteStoredFile(stored.storedFileName);
    throw err;
  }

  deleteStoredFile(row.stored_file_name);
  return toApiShape(updated);
}

// Archive is the preferred removal (plan Section 7.7): the evidence trail for
// what a permit was built from should not silently disappear.
async function archiveSourceDocument(permitId, documentId) {
  const id = await requirePermitId(permitId);
  const row = await requireOwnedDocument(id, requireDocumentId(documentId));
  return toApiShape(await repository.setStatus(row.source_document_id, 'ARCHIVED'));
}

async function restoreSourceDocument(permitId, documentId) {
  const id = await requirePermitId(permitId);
  const row = await requireOwnedDocument(id, requireDocumentId(documentId));
  const duplicate = await repository.findByHash(id, row.file_hash, {
    excludeId: row.source_document_id,
  });
  if (duplicate) {
    throw new ValidationError(
      `This exact file is already active on this permit as "${duplicate.original_file_name}"`
    );
  }
  return toApiShape(await repository.setStatus(row.source_document_id, 'ACTIVE'));
}

// Hard delete, allowed only on an already-archived record. This makes deletion
// a deliberate two-step action rather than a single click that destroys
// provenance.
async function deleteSourceDocument(permitId, documentId) {
  const id = await requirePermitId(permitId);
  const row = await requireOwnedDocument(id, requireDocumentId(documentId));
  if (row.status !== 'ARCHIVED') {
    throw new ValidationError('Archive this source document before deleting it');
  }
  await repository.remove(row.source_document_id);
  deleteStoredFile(row.stored_file_name);
  return true;
}

module.exports = {
  VALID_SOURCE_TYPES,
  listSourceDocuments,
  getSourceDocument,
  getDownloadTarget,
  createSourceDocument,
  updateSourceDocument,
  replaceSourceDocument,
  archiveSourceDocument,
  restoreSourceDocument,
  deleteSourceDocument,
};
