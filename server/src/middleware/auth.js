// Verifies the JWT from the Authorization header and attaches req.user
// (Section 11 / FR-0.1, FR-0.4). All routes except /auth/login require this.

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    // Resolve the current database role/status on every request. A role change
    // therefore takes effect immediately instead of leaving the old JWT claim
    // privileged until token expiry.
    const user = await userRepository.findById(payload.sub);
    if (!user || !user.is_active || Number(user.failed_attempts) >= config.maxFailedAttempts) {
      return res.status(401).json({ message: 'Account is unavailable' });
    }
    req.user = { id: user.user_id, role: user.role, email: user.email };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
