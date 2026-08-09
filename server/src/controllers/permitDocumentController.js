// Dev 2 — permit_documents request handlers (mirrors permitRoutes.js).

const permitDocumentService = require('../services/permitDocumentService');
const { ValidationError } = require('../utils/errors');

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError(`Invalid ${label}`);
  }
  return id;
}

async function list(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    res.json(await permitDocumentService.listDocuments(permitId, req.query.processType));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const documentId = parseId(req.params.documentId, 'document id');
    res.json(await permitDocumentService.getDocument(permitId, documentId));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    res.status(201).json(await permitDocumentService.createDocument(permitId, req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const documentId = parseId(req.params.documentId, 'document id');
    res.json(await permitDocumentService.updateDocument(permitId, documentId, req.body || {}));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const documentId = parseId(req.params.documentId, 'document id');
    await permitDocumentService.deleteDocument(permitId, documentId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function reorder(req, res, next) {
  try {
    const permitId = parseId(req.params.id, 'permit id');
    const { processType, documentIds } = req.body || {};
    res.json(await permitDocumentService.reorderDocuments(permitId, processType, documentIds));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, reorder };
