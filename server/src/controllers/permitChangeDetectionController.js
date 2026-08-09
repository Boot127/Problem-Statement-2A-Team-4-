const service = require('../services/permitChangeDetectionService');

async function compare(req, res, next) {
  try {
    res.json(await service.compareSourceDocument(req.params.id, req.params.documentId));
  } catch (error) {
    next(error);
  }
}

async function apply(req, res, next) {
  try {
    res.json(await service.applyReviewedChanges(req.params.id, req.params.documentId, req.body || {}));
  } catch (error) {
    next(error);
  }
}

module.exports = { compare, apply };
