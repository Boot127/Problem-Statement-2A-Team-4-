const auditRepository = require('../repositories/auditRepository');
const overviewRepository = require('../repositories/adminOverviewRepository');
const userRepository = require('../repositories/userRepository');
const env = require('../config/env');

const SENSITIVE_KEY = /(password|password_hash|token|jwt|secret|api.?key|database.?url|connection.?string)/i;

function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function cleanText(value, label, max = 200) {
  const text = String(value || '').trim();
  if (text.length > max) throw httpError(400, `${label} must be ${max} characters or fewer`);
  return text;
}
function date(value, label) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw httpError(400, `${label} must use YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw httpError(400, `${label} is invalid`);
  return value;
}
function parseJson(value) { try { return value ? JSON.parse(value) : null; } catch { return null; } }
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(entry)]));
}
function shape(row) {
  return {
    id: Number(row.log_id), userId: row.user_id == null ? null : Number(row.user_id),
    actorName: row.actor_name || 'System', actorEmail: row.actor_email || '',
    action: row.display_action, entityType: row.entity_type, entityId: row.entity_id == null ? null : Number(row.entity_id),
    targetTitle: row.target_title || `${row.entity_type} #${row.entity_id ?? 'unknown'}`,
    targetEmail: row.target_user_email || '', oldValue: redact(parseJson(row.old_value)),
    newValue: redact(parseJson(row.new_value)), createdAt: row.created_at,
  };
}

async function list(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 15, 1), 50);
  const userId = query.userId ? Number(query.userId) : undefined;
  if (query.userId && (!Number.isInteger(userId) || userId < 1)) throw httpError(400, 'A valid user filter is required');
  const filters = {
    search: cleanText(query.search, 'Search'), userId,
    entityType: cleanText(query.entityType, 'Entity type', 60), action: cleanText(query.action, 'Action', 60),
    dateFrom: date(query.dateFrom, 'Start date'), dateTo: date(query.dateTo, 'End date'), page, limit,
  };
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) throw httpError(400, 'Start date must not be after end date');
  const [result, options, users] = await Promise.all([
    auditRepository.adminList(filters), auditRepository.activityFilterOptions(), userRepository.findAll(),
  ]);
  return {
    items: result.rows.map(shape),
    pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: Math.ceil(result.total / result.limit) },
    filterOptions: {
      ...options,
      users: users.map((user) => ({ id: Number(user.user_id), name: user.full_name, email: user.email })),
    },
  };
}

async function overview() {
  const [rawCounts, activity] = await Promise.all([
    overviewRepository.counts(env.maxFailedAttempts),
    auditRepository.adminList({ page: 1, limit: 5 }),
  ]);
  return {
    counts: Object.fromEntries(Object.entries(rawCounts).map(([key, value]) => [key.replace(/_([a-z])/g, (_m, letter) => letter.toUpperCase()), Number(value)])),
    recentActivity: activity.rows.map(shape),
  };
}

module.exports = { list, overview, redact };
