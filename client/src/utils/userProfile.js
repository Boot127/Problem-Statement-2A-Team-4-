import { ROLE_LABELS } from './enums';

const PROFILE_METADATA = {
  'admin@hrckmp.test': {
    displayName: 'Admin User', department: 'Platform Administration', office: 'Singapore', employeeId: 'ADM-001',
  },
  'compliance@hrckmp.test': {
    displayName: 'Compliance User', department: 'Compliance Operations', office: 'Singapore', employeeId: 'CMP-001',
  },
  'sales@hrckmp.test': {
    displayName: 'Sales User', department: 'Client Solutions', office: 'Singapore', employeeId: 'SLS-001',
  },
  'cs@hrckmp.test': {
    displayName: 'Customer Service User', department: 'Client Support', office: 'Singapore', employeeId: 'CS-001',
  },
};

export const ROLE_PERMISSIONS = {
  admin: [
    'Access Administration, user roles, activity history and security overview',
    'Restore and permanently delete eligible archived items',
    'View the full shared audit trail',
    'View all compliance visibility levels',
  ],
  compliance: [
    'Create, edit and archive compliance content',
    'Create, edit and review Legal Update newsletters',
    'Use Compliance Content AI assistance',
    'View the personal audit trail',
  ],
  sales: [
    'Read and search published content allowed by visibility rules',
    'Use client-facing compliance and Work Permit information',
    'No content editing or Administration access',
  ],
  customer_service: [
    'Read and search published content allowed by visibility rules',
    'Use permitted information to support customer enquiries',
    'No content editing or Administration access',
  ],
};

export function userProfile(user = {}) {
  const metadata = PROFILE_METADATA[String(user.email || '').toLowerCase()] || {};
  const accountStatus = user.accountStatus
    || (!user.isActive ? 'DISABLED' : Number(user.failedAttempts) >= 5 ? 'LOCKED' : 'ACTIVE');
  return {
    ...user,
    displayName: metadata.displayName || user.fullName || user.email || 'User',
    department: metadata.department || 'Not assigned',
    office: metadata.office || 'Not recorded',
    employeeId: metadata.employeeId || 'Not recorded',
    roleLabel: ROLE_LABELS[user.role] || user.role || 'Unknown role',
    accountStatus,
    permissions: ROLE_PERMISSIONS[user.role] || [],
  };
}

export function initialsForUser(user) {
  const name = userProfile(user).displayName.trim();
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

export function formatAccountDate(value, emptyLabel = 'Not recorded') {
  if (!value) return emptyLabel;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? emptyLabel : date.toLocaleString();
}
