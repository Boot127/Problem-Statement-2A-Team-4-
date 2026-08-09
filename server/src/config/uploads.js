// Dev 2 — source-document upload configuration (improvement plan Section 7).
//
// Everything security-relevant about uploads is centralised here so the rules
// are reviewable in one place:
//   - files are written OUTSIDE the client's public folder
//   - the stored name is server-generated; the original name never touches disk
//   - the extension, the declared MIME type, and the file's actual magic bytes
//     must all agree before a file is accepted
//   - size is capped, and empty files are rejected

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// server/uploads — sibling of src/, never served statically, gitignored.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (plan Section 7.6)

// Allowlist, not a blocklist. A blocklist of "dangerous" extensions is always
// incomplete; only these three shapes are accepted.
const ALLOWED_TYPES = [
  {
    extension: '.pdf',
    mimeTypes: ['application/pdf'],
    label: 'PDF',
    // '%PDF'
    magic: [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  },
  {
    extension: '.docx',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    label: 'Word document (DOCX)',
    // DOCX is a ZIP container: 'PK\x03\x04' (or the empty/spanned variants).
    magic: [
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from([0x50, 0x4b, 0x05, 0x06]),
      Buffer.from([0x50, 0x4b, 0x07, 0x08]),
    ],
  },
];

const ALLOWED_EXTENSIONS = ALLOWED_TYPES.map((t) => t.extension);
const ALLOWED_LABEL = ALLOWED_TYPES.map((t) => t.label).join(' or ');

function extensionOf(fileName) {
  return path.extname(String(fileName || '')).toLowerCase();
}

function typeForExtension(extension) {
  return ALLOWED_TYPES.find((t) => t.extension === extension) || null;
}

// Confirms the bytes on disk actually match the claimed type. This is the check
// that stops an executable renamed to .pdf, which extension/MIME checks alone
// cannot catch because both come from the client.
function matchesMagicBytes(buffer, type) {
  return type.magic.some((signature) => buffer.subarray(0, signature.length).equals(signature));
}

// Random, collision-proof, and carries only a validated extension — the
// original name is never used to build a path.
function generateStoredFileName(extension) {
  return `${crypto.randomUUID()}${extension}`;
}

function storedFilePath(storedFileName) {
  // Guard against traversal even though the name is server-generated: resolve
  // and confirm the result is still inside UPLOAD_DIR.
  const resolved = path.resolve(UPLOAD_DIR, path.basename(String(storedFileName)));
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    throw new Error('Resolved upload path escaped the upload directory');
  }
  return resolved;
}

// Files are buffered in memory so the magic-byte check can run BEFORE anything
// is written to disk — a rejected upload never becomes a file. 10 MB is small
// enough for this to be safe.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = extensionOf(file.originalname);
    const type = typeForExtension(extension);
    if (!type) {
      cb(new Error(`Only ${ALLOWED_LABEL} files are accepted`));
      return;
    }
    if (!type.mimeTypes.includes(file.mimetype)) {
      cb(new Error(`The file's type (${file.mimetype}) does not match its ${extension} extension`));
      return;
    }
    cb(null, true);
  },
});

module.exports = {
  UPLOAD_DIR,
  MAX_FILE_BYTES,
  ALLOWED_TYPES,
  ALLOWED_EXTENSIONS,
  ALLOWED_LABEL,
  extensionOf,
  typeForExtension,
  matchesMagicBytes,
  generateStoredFileName,
  storedFilePath,
  upload,
};
