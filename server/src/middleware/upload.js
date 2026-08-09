// Multer config for record_attachments (FR-1.5: source-document attachments).
// Mirrors the type/size limits already enforced client-side
// (client/src/utils/fileValidation.js) — server-side is the authoritative
// check per NFR-1 ("all inputs validated").

const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'records');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_TYPES.has(file.mimetype)) {
      return cb(new Error('File type not supported. Accepted formats: PDF, DOCX, XLSX, JPG, PNG.'));
    }
    return cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR };
