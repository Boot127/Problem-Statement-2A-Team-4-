// Enforces role-based access control per Section 4 of the HLD.
// Usage: router.post('/records', auth, authorize('compliance'), handler)
module.exports = function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user.role}' is not permitted to perform this action` });
    }
    return next();
  };
};
