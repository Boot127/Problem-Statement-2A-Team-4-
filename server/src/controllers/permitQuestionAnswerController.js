const service = require('../services/permitQuestionAnswerService');

async function ask(req, res, next) {
  try {
    res.json(await service.askPermit(req.params.id, req.body?.question));
  } catch (error) {
    next(error);
  }
}

module.exports = { ask };
