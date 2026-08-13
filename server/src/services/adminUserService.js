const userRepository = require('../repositories/userRepository');
const auditService = require('./auditService');
const env = require('../config/env');

const ALLOWED_ROLES = ['admin', 'compliance', 'sales', 'customer_service'];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requireId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'A valid user id is required');
  return id;
}

function accountStatus(user) {
  if (!user.is_active) return 'DISABLED';
  if (Number(user.failed_attempts) >= env.maxFailedAttempts) return 'LOCKED';
  return 'ACTIVE';
}

function shape(user) {
  return {
    id: Number(user.user_id),
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    accountStatus: accountStatus(user),
    failedAttempts: Number(user.failed_attempts || 0),
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

async function listUsers() {
  return (await userRepository.findAll()).map(shape);
}

async function getUser(idValue) {
  const user = await userRepository.findById(requireId(idValue));
  if (!user) throw httpError(404, 'User not found');
  return shape(user);
}

async function changeRole(idValue, newRoleValue, admin) {
  const id = requireId(idValue);
  const newRole = String(newRoleValue || '').trim();
  if (!ALLOWED_ROLES.includes(newRole)) {
    throw httpError(400, `Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  return userRepository.transaction(async () => {
    const existing = await userRepository.findById(id);
    if (!existing) throw httpError(404, 'User not found');
    if (existing.role === newRole) return shape(existing);

    if (existing.role === 'admin' && newRole !== 'admin' && existing.is_active) {
      const administrators = await userRepository.countActiveAdministrators();
      if (administrators <= 1) {
        throw httpError(409, 'At least one Administrator account must remain active.');
      }
    }

    const updated = await userRepository.updateRole(id, newRole);
    await auditService.log({
      userId: admin.id,
      action: 'update',
      entityType: 'user_role',
      entityId: id,
      oldValue: { event: 'USER_ROLE_CHANGED', role: existing.role },
      newValue: { event: 'USER_ROLE_CHANGED', role: newRole },
    });
    return shape(updated);
  });
}

module.exports = { ALLOWED_ROLES, listUsers, getUser, changeRole };
