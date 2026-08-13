// Shared — login, token issue/verify, password hashing (HLD Section 11).

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const auditService = require('./auditService');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sanitizeUser(user) {
  return {
    id: user.user_id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.is_active),
    failedAttempts: Number(user.failed_attempts || 0),
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

async function login(email, password) {
  const user = await userRepository.findByEmail(email);

  // Same error for "no such user" and "wrong password" so login can't be
  // used to enumerate registered emails (FR-0.1 / NFR-1).
  if (!user || !user.is_active) {
    throw httpError(401, 'Invalid email or password');
  }
  if (user.failed_attempts >= config.maxFailedAttempts) {
    throw httpError(423, 'Account locked after too many failed login attempts. Contact an administrator.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    await userRepository.incrementFailedAttempts(user.user_id);
    throw httpError(401, 'Invalid email or password');
  }

  await userRepository.recordSuccessfulLogin(user.user_id);
  auditService.log({ userId: user.user_id, action: 'login', entityType: 'user', entityId: user.user_id });

  const token = jwt.sign({ sub: user.user_id, role: user.role, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return { token, user: sanitizeUser(await userRepository.findById(user.user_id)) };
}

// The API is stateless (Section 9) — there is no server-side session to
// invalidate. Logout is an audit-logged no-op; the client discards the JWT.
function logout(userId) {
  if (userId) {
    auditService.log({ userId, action: 'logout', entityType: 'user', entityId: userId });
  }
}

async function getById(userId) {
  const user = await userRepository.findById(userId);
  return user ? sanitizeUser(user) : null;
}

module.exports = { login, logout, getById, sanitizeUser };
