// Filters content queries by the caller's permitted visibility levels
// (Section 15). Attaches req.allowedVisibility for repositories/services to
// use in their WHERE clause — enforcement lives in the data layer, not just
// the UI (NFR-1, R7 in the risk register).
const { allowedVisibilityFor } = require('../utils/visibilityRules');

module.exports = function visibility(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.allowedVisibility = allowedVisibilityFor(req.user.role);
  return next();
};
