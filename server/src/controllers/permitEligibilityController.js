const service = require('../services/permitEligibilityService');

async function check(req, res, next) {
  try {
    res.json(await service.checkEligibility(req.params.id, req.body || {}));
  } catch (error) {
    next(error);
  }
}

module.exports = { check };
