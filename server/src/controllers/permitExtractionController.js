const service = require('../services/permitExtractionService');

async function extract(req, res, next) {
  try {
    res.json(await service.extractFromSourceDocument(req.params.id, req.params.documentId));
  } catch (err) { next(err); }
}

async function apply(req, res, next) {
  try {
    res.json(await service.applyReviewedExtraction(req.params.id, req.params.documentId, req.body || {}));
  } catch (err) { next(err); }
}

module.exports = { extract, apply };
