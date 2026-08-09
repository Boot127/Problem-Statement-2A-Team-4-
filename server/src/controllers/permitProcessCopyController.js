const service = require('../services/permitProcessCopyService');

async function copy(req, res, next) {
  try {
    res.status(201).json(await service.copyProcess(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
}

module.exports = { copy };
