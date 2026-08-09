// Dev 2 — source-document request handlers (mirrors permitRoutes.js).

const multer = require('multer');
const service = require('../services/permitSourceDocumentService');
const { upload, MAX_FILE_BYTES } = require('../config/uploads');

// Multer reports its own failures (size limit, rejected type) as errors with a
// `code`, not as our ValidationError. Translating them here keeps the client
// contract uniform: every bad upload is a 400 with a readable `message`.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `File must be ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB or smaller`
          : err.code === 'LIMIT_FILE_COUNT'
            ? 'Upload one file at a time'
            : `Upload failed: ${err.message}`;
      res.status(400).json({ message });
      return;
    }
    // fileFilter rejections arrive as plain Errors carrying our message.
    res.status(400).json({ message: err.message });
  });
}

async function list(req, res, next) {
  try {
    res.json(
      await service.listSourceDocuments(req.params.id, {
        includeArchived: req.query.includeArchived !== 'false',
      })
    );
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await service.getSourceDocument(req.params.id, req.params.documentId));
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const { filePath, fileName, mimeType } = await service.getDownloadTarget(
      req.params.id,
      req.params.documentId
    );
    // `attachment` (never `inline`) so an uploaded file is always downloaded
    // rather than rendered in the browser's origin.
    res.type(mimeType);
    // Express safely encodes Unicode display names in Content-Disposition.
    res.attachment(fileName);
    // Belt and braces: tell the browser not to sniff a different type.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.createSourceDocument(req.params.id, req.file, req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.updateSourceDocument(req.params.id, req.params.documentId, req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function replace(req, res, next) {
  try {
    res.json(await service.replaceSourceDocument(req.params.id, req.params.documentId, req.file));
  } catch (err) {
    next(err);
  }
}

async function archive(req, res, next) {
  try {
    res.json(await service.archiveSourceDocument(req.params.id, req.params.documentId));
  } catch (err) {
    next(err);
  }
}

async function restore(req, res, next) {
  try {
    res.json(await service.restoreSourceDocument(req.params.id, req.params.documentId));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteSourceDocument(req.params.id, req.params.documentId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleUpload,
  list,
  getById,
  download,
  create,
  update,
  replace,
  archive,
  restore,
  remove,
};
