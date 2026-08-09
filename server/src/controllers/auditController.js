// Shared — audit trail request handler (Section 14.6 / Section 4.5).

const auditService = require('../services/auditService');

async function list(req, res) {
  const result = await auditService.list({
    role: req.user.role,
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
  });
  res.json(result);
}

module.exports = { list };
