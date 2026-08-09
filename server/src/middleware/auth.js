// Verifies the JWT from the Authorization header and attaches req.user
// (Section 11 / FR-0.1, FR-0.4). All routes except /auth/login require this.

const jwt = require('jsonwebtoken');
const config = require('../config/env');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
